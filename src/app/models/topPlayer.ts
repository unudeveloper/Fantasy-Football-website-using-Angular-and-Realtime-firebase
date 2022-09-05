export class TopPlayer{
    rank: number = null;
    playerName: String = null;
    teamName: String = null;
    position: String = null;
    byeWeek: String = null;
    owner: String = null;
    status: String = "available";

    constructor(rank: number, playerName: String, teamName: String, position: String, byeWeek: String){
      this.rank = rank;
      this.playerName = playerName;
      this.teamName = teamName;
      this.position = position;
      this.byeWeek = byeWeek;
    }
}
  