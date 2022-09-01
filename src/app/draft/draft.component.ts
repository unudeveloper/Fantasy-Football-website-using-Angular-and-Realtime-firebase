import { Component, OnInit } from '@angular/core';
import { StoreService } from '../store.service';
import { Observable } from 'rxjs';
import { ToastService } from '../toast/toast.service';

@Component({
    selector: 'app-profile',
    templateUrl: './draft.component.html',
    styleUrls: ['./draft.component.css']
})

export class DraftComponent implements OnInit {

    constructor(private store: StoreService, private toast: ToastService) { }

    ngOnInit() {
    }
}