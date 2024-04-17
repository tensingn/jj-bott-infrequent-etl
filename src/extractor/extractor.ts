import {
	NFLTeamTankModel,
	ScheduleTankModel,
	SleeperService,
	TankService,
} from "@tensingn/son-of-botker-services";

export class Extractor {
	private tankService: TankService;
	private sleeperService: SleeperService;

	constructor(tankKey: string) {
		this.tankService = new TankService(tankKey);
		this.sleeperService = new SleeperService();
	}

	async getAllNFLTeamsAndSchedules(yearsBack: number): Promise<{
		nflTeams: Array<NFLTeamTankModel>;
		schedules: Array<ScheduleTankModel>;
	}> {
		const nflTeams = await this.getAllNFLTeams();
		let { season, season_type } = await this.sleeperService.getNFLState();

		if (season_type === "off") {
			season = (parseInt(season) - 1).toString();
		}

		const years = this.getYearsArray(season, yearsBack);

		let schedules = new Array<ScheduleTankModel>();
		for (const year of years) {
			const schedulesThatYear = await this.getSchedulesForSeason(
				year,
				nflTeams
			);
			schedules.push(...schedulesThatYear);
		}

		return { nflTeams, schedules };
	}

	private async getAllNFLTeams(): Promise<Array<NFLTeamTankModel>> {
		return this.tankService.getAllNFLTeams();
	}

	private async getNFLTeamSchedule(
		teamID: string,
		season: string
	): Promise<ScheduleTankModel> {
		return this.tankService.getNFLTeamSchedule(teamID, season);
	}

	private getYearsArray(endSeason: string, yearsBack: number): Array<string> {
		const years = [endSeason];

		const endSeasonNumber = parseInt(endSeason);
		for (let i = 1; i < yearsBack; i++) {
			years.push((endSeasonNumber - i).toString());
		}

		return years;
	}

	private async getSchedulesForSeason(
		year: string,
		teams: Array<NFLTeamTankModel>
	): Promise<Array<ScheduleTankModel>> {
		const schedulesThisYear: Array<ScheduleTankModel> = [];

		for (const team of teams) {
			const schedule = await this.getNFLTeamSchedule(team.teamAbv, year);
			schedulesThisYear.push(schedule);
		}

		return schedulesThisYear;
	}
}
