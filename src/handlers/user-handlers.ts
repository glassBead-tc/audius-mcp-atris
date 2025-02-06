import { ServerResult } from "@modelcontextprotocol/sdk/types.js";
import { ManagerFactory } from "../managers/manager-factory.js";
import { sdk } from '@audius/sdk';
import {
  GetUserSchema,
  GetUserByHandleSchema,
  SearchUsersSchema,
  FollowUserSchema,
  UnfollowUserSchema,
  GetUserFollowersSchema,
  GetUserFollowingSchema,
  GetUserTracksSchema,
  GetUserFavoritesSchema,
  GetUserRepostsSchema
} from "../schemas/user-schemas.js";

export class UserHandlers {
  private audiusSdk: ReturnType<typeof sdk>;
  private managerFactory: ManagerFactory;

  constructor(audiusSdk: ReturnType<typeof sdk>, managerFactory: ManagerFactory) {
    this.audiusSdk = audiusSdk;
    this.managerFactory = managerFactory;
  }

  async getUser(args: unknown): Promise<ServerResult> {
    const { userId } = GetUserSchema.parse(args);
    const response = await this.audiusSdk.users.getUser({ id: userId });
    return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
  }

  async getUserByHandle(args: unknown): Promise<ServerResult> {
    const { handle } = GetUserByHandleSchema.parse(args);
    const response = await this.audiusSdk.users.getUserByHandle({ handle });
    return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
  }

  async searchUsers(args: unknown): Promise<ServerResult> {
    const { query } = SearchUsersSchema.parse(args);
    const response = await this.audiusSdk.users.searchUsers({ query });
    return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
  }

  async followUser(args: unknown): Promise<ServerResult> {
    const { userId, followeeUserId } = FollowUserSchema.parse(args);
    const response = await this.audiusSdk.users.followUser({ userId, followeeUserId });
    return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
  }

  async unfollowUser(args: unknown): Promise<ServerResult> {
    const { userId, followeeUserId } = UnfollowUserSchema.parse(args);
    const response = await this.audiusSdk.users.unfollowUser({ userId, followeeUserId });
    return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
  }

  async getUserFollowers(args: unknown): Promise<ServerResult> {
    const { userId, limit, offset } = GetUserFollowersSchema.parse(args);
    const response = await this.audiusSdk.users.getFollowers({ id: userId, limit, offset });
    return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
  }

  async getUserFollowing(args: unknown): Promise<ServerResult> {
    const { userId, limit, offset } = GetUserFollowingSchema.parse(args);
    const response = await this.audiusSdk.users.getFollowing({ id: userId, limit, offset });
    return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
  }

  async getUserTracks(args: unknown): Promise<ServerResult> {
    const { userId, limit, offset, sort, sortMethod, sortDirection, filterTracks } = GetUserTracksSchema.parse(args);
    const response = await this.audiusSdk.users.getTracksByUser({ 
      id: userId, 
      limit, 
      offset,
      sort,
      sortMethod,
      sortDirection,
      filterTracks
    });
    return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
  }

  async getUserFavorites(args: unknown): Promise<ServerResult> {
    const { userId } = GetUserFavoritesSchema.parse(args);
    const response = await this.audiusSdk.users.getFavorites({ id: userId });
    return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
  }

  async getUserReposts(args: unknown): Promise<ServerResult> {
    const { userId, limit, offset } = GetUserRepostsSchema.parse(args);
    const response = await this.audiusSdk.users.getReposts({ id: userId, limit, offset });
    return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
  }
}
