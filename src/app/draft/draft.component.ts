import { Component, OnInit } from '@angular/core';
import { StoreService } from '../store.service';
import { Observable } from 'rxjs';
import { ToastService } from '../toast/toast.service';
import { Router } from '@angular/router';
@Component({
    selector: 'app-profile',
    templateUrl: './draft.component.html',
    styleUrls: ['./draft.component.css']
})

export class DraftComponent implements OnInit {
    leagueflag:Observable<String>;
    constructor(private store: StoreService, private toast: ToastService, private router: Router) { 
    }

    ngOnInit() {
        this.leagueflag = this.store.getLeagueFlag();
        this.leagueflag.subscribe( league => {
            if(league == 'ended') {
                this.router.navigate(['/draft']);
            }
            else {
                this.router.navigate(['/draft/',league]);
            }
            
        });
    }
}