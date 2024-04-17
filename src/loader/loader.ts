import { NFLTeamModel, TeamModel } from "@tensingn/son-of-botker-models";
import { DataAPIService } from "@tensingn/son-of-botker-services";

export class Loader {
	private readonly dataAPI: DataAPIService;

	constructor(dataAPIURL: string) {
		this.dataAPI = new DataAPIService(dataAPIURL);
	}

	async loadTeams(nflTeams: Array<NFLTeamModel>) {
		await this.dataAPI.bulkCreate("nflTeams", nflTeams);
	}
}
