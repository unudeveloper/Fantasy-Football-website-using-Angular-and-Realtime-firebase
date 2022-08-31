import { Player } from './player';

export class League {
    teamMap: { [k: number]: string; };
    constructor() {
        this.stage = 'bid';
        this.members = [];
    }
    leagueId: string;
    admin: string;
    adminName: string;
    members: string[];
    players: any;
    stage: string;
    name: string;
    key: string;
    adminKey: string;

    public setAdmin(uid: string): void {
        this.admin = uid;
        // this.members.push(uid);
    }
    public setAdminName(name: string): void {
        this.adminName = name;
    }
    getKey(): string {
        return this.key;
    }
}
