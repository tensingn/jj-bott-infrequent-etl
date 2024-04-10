import "dotenv/config";
import { Collection, STANDARD } from "@tensingn/firebary";
import { PlayerModel, TeamModel } from "@tensingn/son-of-botker-models";

const collection: Collection = new Collection(
	{
		projectId: process.env.GCP_PROJECTID,
		keyFilename: process.env.GCP_KEYFILENAME,
		ignoreUndefinedProperties: true,
	},
	[PlayerModel],
	"players"
);

console.log((await collection.getCollection(STANDARD)).length);
