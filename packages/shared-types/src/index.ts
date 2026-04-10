export const orgRoles = ["owner", "admin", "member"] as const;
export type OrgRole = (typeof orgRoles)[number];

export const projectRoles = ["admin", "developer", "viewer"] as const;
export type ProjectRole = (typeof projectRoles)[number];

export const bucketVisibilities = ["private", "public"] as const;
export type BucketVisibility = (typeof bucketVisibilities)[number];

export interface JwtActorClaims {
  sub: string;
  sid: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  email: string;
  email_verified: boolean;
  name?: string;
}

