import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import dayjs from 'dayjs';
import { Integration, PrismaClient } from '@prisma/client';

// Facebook has no public API to post into groups, so this provider never
// calls Facebook directly. `publish()` only queues the post in
// FacebookGroupQueue; a separate hourly cron process (built independently
// of this provider) reads the queue and posts manually in a real browser.
// No NestJS DI is available here - socialIntegrationList in
// integration.manager.ts instantiates every provider with `new`, the same
// way telegram.provider.ts keeps its own module-level `telegramBot`
// singleton - so this provider keeps its own module-level Prisma client.
const prismaClient = new PrismaClient();

export class FacebookGroupProvider
  extends SocialAbstract
  implements SocialProvider
{
  identifier = 'facebook-group';
  name = 'Facebook Group';
  isBetweenSteps = false;
  scopes = [] as string[];
  editor = 'normal' as const;

  maxLength() {
    return 63206;
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    return {
      refreshToken: '',
      expiresIn: 0,
      accessToken: '',
      id: '',
      name: '',
      picture: '',
      username: '',
    };
  }

  async generateAuthUrl() {
    const state = makeId(6);
    return {
      url: state,
      codeVerifier: makeId(10),
      state,
    };
  }

  // There is no OAuth flow: the user manually types the group's name and
  // Facebook URL. AddProviderComponent's generic customFields form (the same
  // one listmonk/skool use) posts them here as `{ groupName, groupUrl }`
  // base64-encoded in `code`, matching how those providers decode `code`.
  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    let body: { groupName: string; groupUrl: string };
    try {
      body = JSON.parse(Buffer.from(params.code, 'base64').toString());
    } catch (e) {
      return 'Invalid group details';
    }

    if (!body?.groupName || !body?.groupUrl) {
      return 'Group name and group URL are required';
    }

    return {
      id: Buffer.from(body.groupUrl).toString('base64'),
      name: body.groupName,
      accessToken: body.groupUrl,
      refreshToken: '',
      expiresIn: dayjs().add(200, 'year').unix() - dayjs().unix(),
      picture: '',
      username: body.groupName,
    };
  }

  async customFields() {
    return [
      {
        key: 'groupName',
        label: 'Group name',
        validation: `/^.+$/`,
        type: 'text' as const,
      },
      {
        key: 'groupUrl',
        label: 'Group URL',
        validation: `/^https:\\/\\/(www\\.)?facebook\\.com\\/groups\\/.+$/`,
        type: 'text' as const,
      },
    ];
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [firstPost] = postDetails;

    const mediaUrls = (firstPost.media || []).map((media) => media.path);

    await prismaClient.facebookGroupQueue.create({
      data: {
        integrationId: integration.id,
        postId: firstPost.id,
        groupName: integration.name,
        groupUrl: accessToken,
        text: firstPost.message,
        mediaUrls,
        status: 'pending',
        scheduledAt: new Date(),
      },
    });

    return [
      {
        id: firstPost.id,
        postId: firstPost.id,
        releaseURL: accessToken,
        status: 'completed',
      },
    ];
  }
}
