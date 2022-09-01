import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { StoreService } from 'src/app/store.service';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { ToastService } from 'src/app/toast/toast.service';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { map } from 'lodash-es';
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
  leagueMembers: Observable<any>;
  tte: Observable<string>;
  closeResult: string;
  leagueCost: number;
  coolDownValue: number;
  currentLeagueId: number;

  constructor(private afAuth: AngularFireAuth, private leagueService: StoreService, private route:ActivatedRoute, private router: Router, private toastService: ToastService,private modalService: NgbModal) {
   this.adminLeagues = leagueService.getAdminLeagues();
   this.memberLeagues = leagueService.getMemberLeagues();
    this.totalLeagues = leagueService.getTotalLeagues();
    this.leagueCost = 200;
    this.coolDownValue = 12;
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

    this.router.navigate(['/draft/',leagueId]);
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

  // getSize(members: object) {

  //   let count = 0;
  //   Object.values(members).map(v => count++);
  //   return count;
  // }

  getMemberCounts(leagueId: string) {
  
    // let count = 0;
    // Object.values(this.leagueMembers).map(v => count++);
    // console.log("this is count",count);
    // return count;
    let count = 0;
    this.leagueService.getLeagueMembers(leagueId).subscribe(data => { count =  data.lengthFromService });
    return count;
  }

  applyLeagueValue() {
    console.log("cost:", this.leagueCost, "cooldown:", this.coolDownValue, "leagueid",this.currentLeagueId);
    this.leagueService.setLeagueFeatures(this.leagueCost, this.coolDownValue, this.currentLeagueId);
  }

  //modal
  open(content,currentLeagueId) {
    this.currentLeagueId = currentLeagueId;

    this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title'}).result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
  }
  
  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return  `with: ${reason}`;
    }
  }
}
