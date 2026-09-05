import { IsDefined, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMediaCategoryDto {
  @IsString()
  @IsDefined()
  @MaxLength(100)
  name: string;
}

export class UpdateMediaCategoryDto {
  @IsString()
  @IsDefined()
  id: string;

  @IsString()
  @IsDefined()
  @MaxLength(100)
  name: string;
}

export class AssignMediaCategoryDto {
  @IsString()
  @IsDefined()
  mediaId: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class BulkAssignMediaCategoryDto {
  @IsDefined()
  mediaIds: string[];

  @IsOptional()
  @IsString()
  categoryId?: string;
}
