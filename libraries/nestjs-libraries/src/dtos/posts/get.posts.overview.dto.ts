import { IsIn, IsOptional, IsString } from 'class-validator';

export class GetPostsOverviewDto {
  @IsIn(['scheduled', 'published', 'drafts', 'ai', 'mail'])
  tab: 'scheduled' | 'published' | 'drafts' | 'ai' | 'mail';

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  mailSegment?: 'sent' | 'draft' | 'schedule';
}
