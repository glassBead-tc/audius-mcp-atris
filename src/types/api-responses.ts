import { UserResponse, TrackResponse } from '@audius/sdk';

export interface AudiusUser extends UserResponse {
  id: string;
  handle: string;
  name: string;
  followers_count: number;
  track_count: number;
}

export interface AudiusTrack extends TrackResponse {
  id: string;
  title: string;
  user: {
    id: string;
    handle: string;
    name?: string;
  };
  play_count: number;
  repost_count: number;
  save_count: number;
}

export interface AudiusResponse<T> {
  data?: T;
  error?: string;
  latest?: boolean;
  signature?: string;
  timestamp?: string;
  version?: string;
}

export type AudiusTrackResponse = AudiusResponse<AudiusTrack>;
export type AudiusUserResponse = AudiusResponse<AudiusUser>;
