import {
	MatchupModel,
	MatchupSleeperModel,
	RosterSleeperModel,
	SeasonModel,
	SeasonSleeperModel,
	TeamModel,
	UserModel,
	UserSleeperModel,
} from "@tensingn/jj-bott-models";

export const sleeperSeasonsToSeasonModels = (sleeperSeasons: Array<SeasonSleeperModel>): Array<SeasonModel> => {
	return sleeperSeasons.map((ss) => {
		const seasonModel = new SeasonModel();
		seasonModel.id = ss.league_id;
		seasonModel.season = ss.season;
		seasonModel.winnerID = ss.metadata.latest_league_winner_roster_id;

		return seasonModel;
	});
};

export const sleeperUsersToUserModels = (sleeperUsers: Array<UserSleeperModel>): Array<UserModel> => {
	return sleeperUsers.map((su) => {
		return {
			id: su.user_id,
			teamName: su.metadata.team_name || su.display_name || su.username,
			username: su.username || su.display_name,
		};
	});
};

export const sleeperMatchupsToMatchupModels = (
	sleeperMatchups: Map<SeasonSleeperModel, Map<string, Array<MatchupSleeperModel>>>
): Array<MatchupModel> => {
	const matchups = new Array<MatchupModel>();

	sleeperMatchups.forEach((ss, season) => {
		ss.forEach((sms, week) => {
			for (let i = 0; i < sms.length; i++) {
				const sleeperMatchup = sms[i];
				if (!sleeperMatchup.matchup_id) continue;

				const matchup = new MatchupModel();
				matchup.season = season.season;
				matchup.week = week;
				matchup.matchupID = sleeperMatchup.matchup_id.toString();
				matchup.teamID = sleeperMatchup.roster_id.toString();
				matchup.playerIDs = sleeperMatchup.players;
				matchup.starterIDs = sleeperMatchup.starters;
				matchup.points = parseFloat(sleeperMatchup.points);

				matchups.push(matchup);
			}
		});
	});

	return matchups;
};

export const sleeperRostersToTeamModels = (
	seasonsAndRosters: Map<SeasonSleeperModel, Array<RosterSleeperModel>>,
	users: Array<UserModel>
): Array<TeamModel> => {
	const teams = new Array<TeamModel>();

	seasonsAndRosters.forEach((rostersOfSeason, season) => {
		teams.push(
			...rostersOfSeason.map((roster) => {
				const team = new TeamModel();
				const user = users.find((u) => u.id === roster.owner_id);
				if (!user) throw new Error("no user found for team");

				team.teamName = user.teamName;
				team.playerIDs = roster.players;
				team.starterIDs = roster.starters;
				team.seasonID = season.season;
				team.username = user.username;
				team.userID = user.id;
				team.wins = roster.settings.wins;
				team.losses = roster.settings.losses;
				team.pointsFor = roster.settings.fpts;
				team.pointsAgainst = roster.settings.fpts_against;
				team.rosterID = roster.roster_id;

				return team;
			})
		);
	});

	return teams;
};
