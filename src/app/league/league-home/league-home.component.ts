import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { StoreService } from 'src/app/store.service';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { ToastService } from 'src/app/toast/toast.service';
@Component({
  selector: 'app-league-home',
  templateUrl: './league-home.component.html',
  styleUrls: ['./league-home.component.css']
})
export class LeagueHomeComponent implements OnInit {
  totalLeagues: Observable<any>;
  adminLeagues: Observable<any>;
  memberLeagues: Observable<any>;
  leagueAdminName: Observable<any>;
  tte: Observable<string>;
  constructor(private afAuth: AngularFireAuth, private leagueService: StoreService, private route:ActivatedRoute, private router: Router, private toastService: ToastService) {
  //  this.adminLeagues = leagueService.getAdminLeagues();
  //  this.memberLeagues = leagueService.getMemberLeagues();
    this.totalLeagues = leagueService.getTotalLeagues();
    console.log("totalleague======",this.totalLeagues);
  }

  ngOnInit() {

  }

  deleteLeague(league: any): void {
    this.leagueService.deleteLeague(league.leagueId);
  }

  // joinRoom(roomid: string): void {
  //   this.leagueService.joinRoom(roomid);
  //   this.router.navigate(['/leagues/',roomid]);
  // }

  joinLeague(leagueId: string): void {
    this.leagueService.joinLeague(leagueId)
      .subscribe(canJoin => {
        if (canJoin) {
          this.showJoinToast();
        } else {
          this.showInvalidToast();
        }
      },
      err => {
        this.showErrorToast();
        console.log(err);
      }
      );
    this.showJoinToast();

    this.router.navigate(['/leagues/',leagueId]);
  }

  getAdminName(userid: string): Observable<string> {
    this.tte = this.leagueService.getAdminName(userid);
    return this.tte;
  }

  showJoinToast() {
    this.toastService.show(`You have joined league.`);
  }

  showErrorToast() {
    this.toastService.show(`Something went wrong when attempting to join this league`);
  }

  showInvalidToast() {
    this.toastService.show(`You have already joined this league!`);
  }

  getSize(members: object) {
    let count = 0;
    Object.values(members).map(v => count++);
    return count;

  }
}
