import * as fs from "node:fs";
import {
	NFLTeamModel,
	NFLTeamNames,
	NFLTeamNamesArray,
	PlayerGameModel,
	PlayerModel,
	PlayerSleeperModel,
	PositionNames,
	PositionNamesArray,
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
			const schedulesThatYear = await this.getSchedulesForSeason(
				year,
				nflTeams
			);
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
				sp.team &&
				sp.status !== "Inactive" &&
				sp.espn_id &&
				sp.fantasy_positions?.some((fp) => positions.includes(fp))
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
					player.tankPlayer = await this.tankService.getPlayerInformation(
						sp.espn_id,
						getStats
					);
				} catch (err) {
					console.log(err);
				}

				return player;
			})
		);
	}

	async getDSTGamesForEachNFLTeam(
		includeFantasyPoints: boolean = false
	): Promise<{
		nflTeamModels: Array<NFLTeamModel>;
		gameMap: Map<NFLTeamNames, Array<GameTankModel>>;
	}> {
		const gameMap = new Map<NFLTeamNames, Array<GameTankModel>>();

		const nflTeamModels = await this.getAllNFLTeamModels();

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

	async getAllPlayerModels(
		limit: number = 10000,
		positions: Array<PositionNames> = [...PositionNamesArray]
	): Promise<Array<PlayerModel>> {
		await this.dataAPI.init();
		return this.dataAPI.performAction<Array<PlayerModel>>(
			"players",
			null,
			null,
			"search",
			{
				limit,
				positions,
			}
		);
	}

	getGame(gameID: string, includeFantasyPoints: boolean = false) {
		return this.tankService.getNFLBoxScore({
			gameID,
			fantasyPoints: includeFantasyPoints,
		});
	}

	async searchPlayerGameModels(
		nflTeams: Array<NFLTeamNames>,
		playerIDs: Array<string>
	): Promise<Array<PlayerGameModel>> {
		await this.dataAPI.init();
		return this.dataAPI.performAction(
			"players",
			null,
			"playerGames",
			"search",
			{
				nflTeams,
				playerIDs,
			}
		);
	}

	async getAllNFLTeamModels(): Promise<Array<NFLTeamModel>> {
		await this.dataAPI.init();
		return this.dataAPI.findMany("nflTeams", undefined, 32);
	}

	async getAllPlayerGameModels(): Promise<Array<PlayerGameModel>> {
		const playerModels = await this.getAllPlayerModels(1000, [
			"QB",
			"RB",
			"FB",
			"WR",
			"TE",
			"K",
		]);

		const playerGameModelsPromises = [
			this.searchPlayerGameModels([...NFLTeamNamesArray], []),
		];

		const chunkSize = 100;
		for (let i = 0; i < playerModels.length; i += chunkSize) {
			playerGameModelsPromises.push(
				this.searchPlayerGameModels(
					[],
					playerModels.slice(i, i + chunkSize).map((player) => player.id)
				)
			);
		}

		const playerPlayerGameModels = (
			await Promise.all(playerGameModelsPromises)
		).flat();

		return playerPlayerGameModels;
	}

	readObjFromFile<T>(fileName: string): T {
		const data = fs.readFileSync(fileName, "utf8");
		return JSON.parse(data) as T;
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
