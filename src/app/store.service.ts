import { Injectable } from '@angular/core';
import { AngularFireDatabase, AngularFireAction, AngularFireList } from '@angular/fire/database';
import { Observable, Subject, zip, combineLatest, Subscription } from 'rxjs';
import { switchMap, map, mergeMap, take, mergeAll, count, reduce, tap } from 'rxjs/operators';
import { AngularFireAuth } from '@angular/fire/auth';
import { PlayerService } from './players.service';
import { LeagueFactoryService } from './league-factory.service';
import { League } from './models/league';
import { Player } from './models/player';
import { User } from 'firebase';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { LeagueAdminConsoleComponent } from './league/league-hub/league-admin-console/league-admin-console.component';

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  static readonly MONEY = 200;
  static readonly SQUAD_LIMIT = 15;
  leaguesRef: AngularFireList<any>;
  uid$: Observable<string>;
  uname$: Observable<string>;
  currentUserMoney$: Observable<number>;
  dirtyUserLeagueEntries$: Subject<any|null>;
  userLeagueKeys$: Observable<AngularFireAction<firebase.database.DataSnapshot>[]>;

  constructor(private db: AngularFireDatabase, private afAuth: AngularFireAuth,
              private playerService: PlayerService, private leagueFactory: LeagueFactoryService , private route:ActivatedRoute, private router: Router ) {
    this.uid$ = afAuth.user.pipe(
      map((u: User) => u.uid),
      take(1)
      );
    this.leaguesRef = db.list('leagues');
    this.dirtyUserLeagueEntries$ = new Subject();
    // Delete dirty user league entries
    this.dirtyUserLeagueEntries$.subscribe(blob => {
      console.log(blob);
      const [uid, leagueIdToDelete] = blob;
      db.list(`users/${uid}/leagues`).remove(leagueIdToDelete);
    });

    // db.list(`users/${uid}/leagues`).snapshotChanges()
    //   .pipe(map(changes => changes
    //     .map(c => ({ key: c.payload.key, ...c.payload.val() as {}}))));

    this.leaguesRef.stateChanges(['child_removed'])
    .subscribe(action => {
      console.log(action);
      // const adminKey = action.payload.val().adminKey;
      const lid = action.payload.val().leagueId;
      const aid = action.payload.val().admin;
      this.db.list(`users/${aid}/admin`).remove(lid);
      const members = action.payload.val().members;

      for (const key of Object.keys(members)) {
        const member = members[key];
        const tup = [member, lid];
        this.dirtyUserLeagueEntries$.next(tup);
        console.log(tup);
      }
    });
  }

  getLeague(leagueId: string): Observable<any> {
    return this.db.object(`leagues/${leagueId}`).valueChanges();
  }

  getLeagueTeamMap(leagueId: string): Observable<Map<number, string>> {
    return this.db.object(`leagues/${leagueId}/teamMap`).valueChanges()
      .pipe(
        take(1),
        map((t: any) => new Map(Object.entries(t)
            .map(([k, v]: [string, string]) => [Number(k), v]))
        )
      );
  }

  createLeague(name: string): void {
    const newLeague$: Observable<[League, string]> = zip(this.leagueFactory.getNewLeague(), this.uid$);
    newLeague$.subscribe(([newLeague, uid]: [League, string]) => {
      newLeague.setAdmin(uid);
      newLeague.name = name;
      let adname;

      const id = this.leaguesRef.push(newLeague).key;
      
      // this.getAdminName(uid).subscribe( event => adname = event); 
      // console.log("%%%%adminname",adname);
      // this.setAdminName(id,adname);

      this.db.list(`leagues/${id}/members`).set(uid,uid);
      // this.db.list(`leagues/${id}/members`).push(uid);

      this.db.list(`users/${uid}/admin`).set(id, { leagueId: id, name });
      this.db.list(`users/${uid}/admin/${id}/members`).push(uid);
      this.leaguesRef.update(id, {leagueId: id});
      this.db.list(`users/${uid}/leagues`)
        .set(id, { leagueId: id, name, status: 'bid', squadSize: 0, uid, money: StoreService.MONEY });

      this.router.navigate(['leagues']);
    });
    
  }
  

  deleteLeague(leagueId: string): void {
    console.log('deleting' + leagueId);
    this.leaguesRef.remove(leagueId);
  }

  leaveLeague(leagueId: string): void {
    console.log("****************");
    this.uid$
      .subscribe(uid => {
        this.db.list(`users/${uid}/leagues/${leagueId}`).remove();
      });

    this.uid$
      .subscribe(uid => {
        this.db.list(`leagues/${leagueId}/members/${uid}`).remove()
      });
    // this.uid$
    //   .pipe(
    //     mergeMap(uid => this.db.list(`leagues`,
    //       ref => ref.orderByChild('admin').equalTo(uid)).valueChanges())
    //   );
  }

  joinLeague(leagueId: string): Observable<boolean> {
    const canJoin$ = this.isMember(leagueId).pipe(map(f => !f));

    return zip(this.getLeague(leagueId).pipe(take(1)), canJoin$, this.uid$)
      .pipe(
        tap(([league, canJoin, uid]: [League, boolean, string]) => {
        if (canJoin) {
          // this.db.list(`leagues/${leagueId}/members`).push(uid);
          this.db.list(`leagues/${leagueId}/members`).set(uid,uid);
          this.db.list(`users/${uid}/leagues`)
            // .set(leagueId, { leagueId, name, status: 'bid', squadSize: 0, uid, money: StoreService.MONEY });
            .set(leagueId, { leagueId, name, status: 'bid', squadSize: 0, uid });
          this.db.list(`users/${uid}/leagues`).update(leagueId, {name: league.name});
        }
        }),
        map(([league, canJoin, uid]: [League, boolean, string]) => canJoin)
      );
  }

  getAdminLeagues(): Observable<any> {

    return this.uid$
      .pipe(
        mergeMap(uid => this.db.list(`leagues`,
          ref => ref.orderByChild('admin').equalTo(uid)).valueChanges())
      );
    // return this.uid$.pipe(
    //   switchMap(uid => this.db.list(`users/${uid}/admin`).valueChanges())
    // );
  }

  getMemberLeagues(): Observable<any> {
    return this.uid$.pipe(
      switchMap(uid => this.db.list(`users/${uid}/leagues`).valueChanges())
    );
  }

  getTotalLeagues(): Observable<any> {
    return this.uid$.pipe(
      switchMap(uid => this.db.list(`leagues`).valueChanges()
      ),
      take(3)   
    ); 
  } 

  isMember(leagueId: string): Observable<boolean> {
    return this.uid$
      .pipe(
        mergeMap(uid => this.db.list(`users/${uid}/leagues`,
          ref => ref.orderByChild('leagueId').equalTo(leagueId)).valueChanges()),
        take(1),
        map(val => Boolean(val.length))
      );
  }

  isFull(leagueId: string): Observable<boolean> {
    return this.uid$
      .pipe(
        mergeMap(uid => this.db.list(`users/${uid}/leagues`,
          ref => ref.orderByChild('leagueId').equalTo(leagueId)).valueChanges()),
        take(1),
        map(val => Boolean(val.length))
      );
  }

  getPlayers(leagueId: string): Observable<Player> {
    return this.db.list(`leagues/${leagueId}/players`)
      .valueChanges()
      .pipe(
        take(1),
        mergeMap(val => val), // Flattens the array
        map((player: Player) => new Player(player))
      );
  }

  getUserDisplayName(userId?: string): Observable<string> {
    if (userId) {
      return this.db.object(`users/${userId}/displayName`).valueChanges()
      .pipe(map(dpName => dpName as string));
    } else {
      return this.uid$
        .pipe(
          mergeMap(uid => this.db.object(`users/${uid}/displayName`).valueChanges()),
          map(dpName => dpName as string)
        );
    }
  }

  setUserDisplayName(displayName: string): void {
    this.uid$
      .subscribe(uid => this.db.object(`users/${uid}/displayName`).set(displayName));
  }

  getUserStatus(leagueId: string): Observable<any> {
    return this.uid$
      .pipe(
        mergeMap(uid => this.db.object(`users/${uid}/leagues/${leagueId}/status`).valueChanges())
      );
  }

  markTentativeBid(leagueId: string, bid: any): void {
    this.uid$
      .subscribe(uid => {
        const key = this.db.list(`users/${uid}/leagues/${leagueId}/tentativeBids`).push(bid).key;
        this.db.list(`users/${uid}/leagues/${leagueId}/tentativeBids`).update(key, {key});
      });
  }

  getTentativeBids(leagueId: string): Observable<any[]> {
    return this.uid$
    .pipe(
      mergeMap(uid => this.db.list<any>(`users/${uid}/leagues/${leagueId}/tentativeBids`).valueChanges())
    );
  }

  deleteTentativeBid(key: string, leagueId: string): void {
    this.uid$
      .subscribe(uid => {
        this.db.list(`users/${uid}/leagues/${leagueId}/tentativeBids`).remove(key);
      });
  }

  getBidHistory(leagueId: string): Observable<any[]> {
    return this.uid$
      .pipe(
        mergeMap(uid => this.db.list<any>(`users/${uid}/leagues/${leagueId}/bidHistory`).valueChanges())
      );
  }

  getSquadSize(leagueId: string): Observable<number> {
    return this.uid$
      .pipe(
        mergeMap(uid => this.db.object<number>(`users/${uid}/leagues/${leagueId}/squadSize`).valueChanges())
      );
  }

  placeBids(leagueId: string, bids: any[]): void {
    this.uid$.subscribe((uid: string) => {
      bids.forEach((b, i) => {
        const id = b.player.id;
        b.uid = uid;
        // Placing bid on player
        this.db.list(`leagues/${leagueId}/players/${id}/bids`).set(uid, b);
        // Pushing bid into user bid history
        this.db.list(`users/${uid}/leagues/${leagueId}/bidHistory`).push(b);
      });
      // Clear already placed bids
      this.db.list(`users/${uid}/leagues/${leagueId}/tentativeBids`).remove();
      // Move status to WAIT
      this.db.object(`users/${uid}/leagues/${leagueId}/status`).set('wait');
    });
  }

  getUserLeagueDetails(leagueId: string, userId: string): Observable<any> {
    return combineLatest([this.db.object(`users/${userId}/leagues/${leagueId}`).valueChanges(),
    this.getUserDisplayName(userId)])
      .pipe(
        map(([ul, memberName]: [any, string]) =>
        ({uid: ul.uid, status: ul.status, squadSize: ul.squadSize, displayName: memberName}))
      );
  }

  getResolvedBids(leagueId: string, memberId?: string): Observable<any[]> {
    if (memberId) {
      return this.db.list(`users/${memberId}/leagues/${leagueId}/resolvedBids`).valueChanges();
    } else {
      return this.uid$
      .pipe(
        mergeMap(uid => this.db.list(`users/${uid}/leagues/${leagueId}/resolvedBids`).valueChanges())
      );
    }
  }

  resolveBids(leagueId: string): void {
    this.db.list<Player>(`leagues/${leagueId}/players`)
      .valueChanges()
      .pipe(
        take(1)
      ).subscribe(
        players => {
          players.forEach(p => {
            if (p.bids && p.status === 'Available') {
              const sortedBids = [...Object.values(p.bids)].map(b => b as any).sort((a, b) => b.amount - a.amount);
              const winBid = sortedBids[0];
              p.owner = winBid.uid;
              p.status = 'Owned';
              p.cost = winBid.amount;
              p.bids = null;
              winBid.status = 'success';
              winBid.player = p;
              this.db.list(`users/${p.owner}/leagues/${leagueId}/resolvedBids`).push(winBid);
              this.db.object(`leagues/${leagueId}/players/${p.id}`).update(p);
            }
          });
        }
      );
    this.db.list(`leagues/${leagueId}/members`)
      .valueChanges()
      .pipe(
        take(1),
        mergeAll()
      ).subscribe(
        m => {
          this.db.object(`users/${m}/leagues/${leagueId}`).update({status: 'bid'});
        }
      );
  }

  updateUserLeagueState(leagueId: string): void {
    const s = StoreService.SQUAD_LIMIT;
    // const m = StoreService.MONEY;


    //mycode
    this.currentUserMoney$ = this.getUserMoney(leagueId);
    let userMoney;
    this.currentUserMoney$.subscribe(event => userMoney = event);

    const m = userMoney;

    const bids$ = this.uid$
      .pipe(
        mergeMap(uid => this.db.list<any>(`users/${uid}/leagues/${leagueId}/resolvedBids`).valueChanges()),
        take(1),
        mergeAll()
      );

    zip(this.uid$, bids$.pipe(count()))
        .subscribe(([uid, c]: [string, number]) => {
          this.db.object(`users/${uid}/leagues/${leagueId}`).update({squadSize: c});
          if (c === StoreService.SQUAD_LIMIT) {
            this.db.object(`users/${uid}/leagues/${leagueId}`).update({status: 'done'});
          }
        });

    zip(this.uid$, bids$.pipe(
          map(b => b.amount),
          reduce((acc, curr) => acc + curr, 0))
        ).subscribe(([uid, sum]: [string, number]) => {
          this.db.object(`users/${uid}/leagues/${leagueId}`).update({money: m - sum });
        });
  }

  getUserMoney(leagueId: string): Observable<number> {
    return this.uid$
      .pipe(
        mergeMap(uid => this.db.object<number>(`users/${uid}/leagues/${leagueId}/money`).valueChanges())
      );
  }

  getAdminName(userId: string): Observable<string> {
    console.log("@@@@@@@adminname",userId);
    return this.db.object<string>(`users/${userId}/name`).valueChanges();
  }

  getLeagueMembers(leagueId: string): Observable<any> {
    console.log("currentLeagueId",leagueId);
    return this.db.object<any>(`leagues/${leagueId}/members`).valueChanges();
  }

  setLeagueFeatures(cost: number, cooldown: number, currentLeagueId: number): void {
    this.uid$
      .subscribe(uid => this.db.object(`users/${uid}/leagues/${currentLeagueId}/money`).set(cost));
    this.uid$
    .subscribe(uid => this.db.object(`users/${uid}/leagues/${currentLeagueId}/cooldown`).set(cooldown));
  }

  setAdminName(currentLeagueId: string,username: string): void {
    this.uid$
      .subscribe(uid => this.db.object(`leagues/${currentLeagueId}/adminname`).set(username));
  }
}
