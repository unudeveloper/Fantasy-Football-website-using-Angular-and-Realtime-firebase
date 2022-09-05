import { Component, OnInit } from '@angular/core';
import { PlayerService } from '../players.service';
import { Player } from '../player';
import { Observable } from 'rxjs';
import { HttpClient } from "@angular/common/http";
import { TopPlayer } from '../models/topPlayer';
@Component({
  selector: 'app-player-list',
  templateUrl: './player-list.component.html',
  styleUrls: ['./player-list.component.css']
})
export class PlayerListComponent implements OnInit {
  players$: Observable<Map<number, Player[]>>;
  teams$: Observable<Map<number, string>>;
  selectedTeam: any;
  public topPlayers: TopPlayer[] = [];

  constructor(private playersService: PlayerService , private http: HttpClient) {
    this.http.get('assets/topplayers.csv', {responseType: 'text'})
    .subscribe(
        data => {
            let csvToRowArray = data.split("\n");
            for (let index = 1; index < csvToRowArray.length - 1; index++) {
              let row = csvToRowArray[index].split(",");
              this.topPlayers.push(new TopPlayer( parseInt( row[0], 10), row[1], row[2], row[3], row[4]));
            }
            // console.log(this.topPlayers);
        },
        error => {
            console.log(error);
        }
    );
  }

  ngOnInit() {
    this.teams$ = this.playersService.getTeamMap();
    this.players$ = this.playersService.getAllPlayersByTeam();
  }

  onSelect(tId: number, tName: string): void {
    this.selectedTeam = {id: tId, name: tName};
  }
}

