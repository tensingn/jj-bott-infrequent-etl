import {
	MatchupSleeperModel,
	NFLTeamModel,
	NFLTeamNames,
	PlayerModel,
	PlayerSleeperModel,
	PositionNames,
	RosterSleeperModel,
	SeasonSleeperModel,
	UserModel,
	UserSleeperModel,
} from "@tensingn/jj-bott-models";
import {
	DataAPIService,
	GameTankModel,
	NFLTeamTankModel,
	ScheduleTankModel,
	SleeperService,
	TankService,
} from "@tensingn/jj-bott-services";
import { PlayerTankModel } from "@tensingn/jj-bott-services/cjs/tank/models/player.tank.model";

export class Extractor {
	private readonly tankService: TankService;
	private readonly sleeperService: SleeperService;
	private readonly dataAPI: DataAPIService;

	constructor(tankKey: string, dataAPIURL: string) {
		this.tankService = new TankService(tankKey);
		this.sleeperService = new SleeperService();
		this.dataAPI = new DataAPIService(dataAPIURL);
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
			const schedulesThatYear = await this.getSchedulesForSeason(year, nflTeams);
			schedules.push(...schedulesThatYear);
		}

		return { nflTeams, schedules };
	}

	async getAllPlayers(
		positions: Array<PositionNames>,
		getStats: boolean = false
	): Promise<
		Array<{
			sleeperPlayer: PlayerSleeperModel;
			tankPlayer: PlayerTankModel | null;
		}>
	> {
		const sleeperPlayersResponse = await this.sleeperService.getAllPlayers();
		const sleeperPlayers = Object.values(sleeperPlayersResponse);

		const filteredSleeperPlayers = sleeperPlayers.filter(
			(sp) =>
				sp.team && sp.status !== "Inactive" && sp.espn_id && sp.fantasy_positions?.some((fp) => positions.includes(fp))
		);

		return await Promise.all(
			filteredSleeperPlayers.map(async (sp) => {
				const player: {
					sleeperPlayer: PlayerSleeperModel;
					tankPlayer: PlayerTankModel | null;
				} = {
					sleeperPlayer: sp,
					tankPlayer: null,
				};

				try {
					player.tankPlayer = await this.tankService.getPlayerInformation(sp.espn_id, getStats);
				} catch (err) {
					console.log(err);
				}

				return player;
			})
		);
	}

	async getDSTGamesForEachNFLTeam(includeFantasyPoints: boolean = false): Promise<{
		nflTeamModels: Array<NFLTeamModel>;
		gameMap: Map<NFLTeamNames, Array<GameTankModel>>;
	}> {
		const gameMap = new Map<NFLTeamNames, Array<GameTankModel>>();

		await this.dataAPI.init();
		const nflTeamModels = await this.dataAPI.findMany<NFLTeamModel>("nflTeams", undefined, 32);

		for (const nflTeam of nflTeamModels) {
			const gamesArray = await Promise.all(
				nflTeam.gameIDs.map((gameID) => {
					return this.getGame(gameID, includeFantasyPoints);
				})
			);

			gameMap.set(nflTeam.teamName, gamesArray);
		}

		return {
			nflTeamModels,
			gameMap,
		};
	}

	async getAllPlayerModels(): Promise<Array<PlayerModel>> {
		await this.dataAPI.init();
		return this.dataAPI.findMany("players", undefined, 1000);
	}

	getGame(gameID: string, includeFantasyPoints: boolean = false) {
		return this.tankService.getNFLBoxScore({
			gameID,
			fantasyPoints: includeFantasyPoints,
		});
	}

	private async getAllNFLTeams(): Promise<Array<NFLTeamTankModel>> {
		return this.tankService.getAllNFLTeams();
	}

	private async getNFLTeamSchedule(teamID: string, season: string): Promise<ScheduleTankModel> {
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

	private async getSchedulesForSeason(year: string, teams: Array<NFLTeamTankModel>): Promise<Array<ScheduleTankModel>> {
		const schedulesThisYear: Array<ScheduleTankModel> = [];

		for (const team of teams) {
			const schedule = await this.getNFLTeamSchedule(team.teamAbv, year);
			schedulesThisYear.push(schedule);
		}

		return schedulesThisYear;
	}

	async getAllSeasons(): Promise<Array<SeasonSleeperModel>> {
		const seasons = new Array<SeasonSleeperModel>();
		let tempSeason: SeasonSleeperModel;
		let tempSeasonID = "992215050884292608";

		do {
			tempSeason = await this.sleeperService.getSeason(tempSeasonID);
			seasons.push(tempSeason);
			tempSeasonID = tempSeason.previous_league_id;
		} while (tempSeason.previous_league_id);

		return seasons;
	}

	async getAllRostersForSeasons(
		seasons: Array<SeasonSleeperModel>
	): Promise<Map<SeasonSleeperModel, Array<RosterSleeperModel>>> {
		const map = new Map<SeasonSleeperModel, Array<RosterSleeperModel>>();

		for (let i = 0; i < seasons.length; i++) {
			map.set(seasons[i], await this.sleeperService.getAllRostersForSeason(seasons[i].league_id));
		}

		return map;
	}

	async getAllMatchupsForSeasons(
		seasons: Array<SeasonSleeperModel>
	): Promise<Map<SeasonSleeperModel, Map<string, Array<MatchupSleeperModel>>>> {
		const map = new Map<SeasonSleeperModel, Map<string, Array<MatchupSleeperModel>>>();

		for (let i = 0; i < seasons.length; i++) {
			const weeksMap = new Map<string, Array<MatchupSleeperModel>>();

			for (let j = 1; j < 18; j++) {
				weeksMap.set(j.toString(), await this.sleeperService.getAllMatchupsForWeek(seasons[i].league_id, j.toString()));
			}

			map.set(seasons[i], weeksMap);
		}

		return map;
	}

	getAllUsers(seasonID: string): Promise<Array<UserSleeperModel>> {
		return this.sleeperService.getAllUsersForSeason(seasonID);
	}

	async getAllUserModels(): Promise<Array<UserModel>> {
		await this.dataAPI.init();
		return this.dataAPI.findMany("users", undefined, 10);
	}
}
