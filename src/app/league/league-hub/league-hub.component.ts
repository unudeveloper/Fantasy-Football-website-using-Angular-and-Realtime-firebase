import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { StoreService } from 'src/app/store.service';
import { switchMap, map, takeUntil, tap, mergeAll, every, take, toArray } from 'rxjs/operators';
import { League } from 'src/app/models/league';
import { Observable, Subject, zip, combineLatest, Subscription , timer} from 'rxjs';
import { AngularFireAuth } from '@angular/fire/auth';
import { User } from 'firebase';
import { isEmpty } from 'lodash-es';

import { interval } from "rxjs";
import { shareReplay } from "rxjs/operators";
import { TopPlayer } from 'src/app/models/topPlayer';
@Component({
  selector: 'app-league-hub',
  templateUrl: './league-hub.component.html',
  styleUrls: ['./league-hub.component.css'],

})
export class LeagueHubComponent implements OnInit, OnDestroy {
  public showContent: boolean = false;

  readonly BID_CART_TITLE = 'Bid Cart';
  readonly BID_HISTORY_TITLE = 'Bid History';

  leagueId$: string;
  unsubscribe$ = new Subject();
  league$: Observable<League>;
  league: League;
  canBid = false;
  isOpen = true;
  status: string;
  isAdmin = false;
  allWait = false;
  memberMap = {};
  money$: Observable<number>;
  leagueMembers$: Observable<any[]>;
  squadSize$: Observable<number>;
  minesubscription: Subscription;
  remainedtime: number;
  bidAmounts: number;
  passedTime: string;

  topRandomPlayer: TopPlayer;

  pauseResumeFlag: number = 1;
  totalPickablePlayer: number;
  counter$: Observable<number>;
  count: number;

  leagueflag:Observable<String>;
  constructor(private router: Router, private store: StoreService, private route: ActivatedRoute, private afAuth: AngularFireAuth) {
    setTimeout( () => this.showContent=true, 5000);

    this.route.paramMap.pipe(
      takeUntil(this.unsubscribe$),
      switchMap((params: ParamMap) => this.store.getUserStatus(params.get('id')))
    ).subscribe(status => {
      this.canBid = status === 'bid';
      this.status = status;
    });

    this.league$ = this.route.paramMap.pipe(
      takeUntil(this.unsubscribe$),
      switchMap((params: ParamMap) => this.store.getLeague(params.get('id'))),
      map(league => {
        league.members = [...Object.values(league.members)];
        return league;
      })
    );

    this.leagueMembers$ = combineLatest([this.league$, this.afAuth.user.pipe(map((u: User) => u.uid))])
      .pipe(
        takeUntil(this.unsubscribe$),
        tap(([l, uid]: [League, string]) => {this.isAdmin = l.admin === uid; }),
        switchMap(([l, uid]: [League, string]) => combineLatest(l.members.map(m => this.store.getUserLeagueDetails(l.leagueId, m)))),
      );

    this.leagueMembers$.subscribe(ulist => {
      this.memberMap = Object.assign({}, ...ulist.map((uObj: any) => ({[uObj.id]: uObj})));
      // console.log(ulist);
      const validStatuses = ([...Object.values(this.memberMap)] as any[]).filter(ms => ms.status !== 'done');
      this.allWait = validStatuses.length && validStatuses.every(ms => ms.status === 'wait');
    });

    this.league$
      .subscribe(l => {
        this.updateState(l.leagueId);
        this.money$ = this.store.getUserMoney(l.leagueId);
        this.squadSize$ = this.store.getSquadSize(l.leagueId);
      });
    
    this.league$.subscribe( l => {
      this.setRandomPlayer(l.leagueId);
      
       this.getRandomPlayer(l.leagueId);
    });

    this.league$.subscribe( l => {
      this.store.getCoolDown(l.leagueId).subscribe( data => { this.count = data;this.secondCounter();});
      this.store.getPickablePlayers(l.leagueId).subscribe( data => { this.totalPickablePlayer = data; });
    })
    console.log("------count:",this.count,"pickableplayers:",this.totalPickablePlayer);
    
  }
  
  ngOnInit() {
    // console.log(this.memberMap);

    this.leagueflag = this.store.getLeagueFlag(); 
    this.leagueflag.subscribe( league => {
        if(league == 'ended'){
          this.router.navigate(['/draft']);
        }
        else {
          this.router.navigate(['/draft/',league]);
        }
        // this.router.navigate(['/draft/',league]);
    });
  }

  pauseResume() {
    this.pauseResumeFlag = -this.pauseResumeFlag;
    this.secondCounter();
  }

  secondCounter() {
    if(this.pauseResumeFlag == 1) {
      this.counter$ = timer(0,1000).pipe(
        take(this.count),
        map(() => --this.count)
      );
    }
    else if(this.pauseResumeFlag == -1) {
      this.counter$ = timer(0,0).pipe(
        take(this.count),
        map(() => this.count)
      );;
    }
  }

  pickPlayerDraft() {

  }

  skipDraft() {

  }

  endDraft() {
    this.league$.subscribe( l =>  this.store.setLeagueFlagOff(l.leagueId));
  }

  markBid(bidamount: number) {
    console.log("------count:",this.count,"pickableplayers:",this.totalPickablePlayer);
  }
  
  setRandomPlayer(leagueid: string) {
    this.store.setRandomPlayer(leagueid);
  }

  getRandomPlayer(leagueId: string) {
    this.store.getRandomPlayer(leagueId).subscribe( data => this.topRandomPlayer = data);
  }

  resolveBids(leagueId: string): void {
    this.store.resolveBids(leagueId);
  }

  updateState(leagueId: string): void {
    this.store.updateUserLeagueState(leagueId);
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  isMemberMapLoaded(): boolean {
    // console.log(this.memberMap);
    return !isEmpty(this.memberMap);
  }

  getMemberEntries(): [string, any][] {
    return Object.entries(this.memberMap);
  }
}
