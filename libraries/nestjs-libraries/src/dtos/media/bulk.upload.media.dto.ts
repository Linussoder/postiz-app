import { IsDefined, IsOptional, IsString } from 'class-validator';

export class BulkUploadMediaDto {
  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class SaveBulkMediaItemDto {
  @IsDefined()
  @IsString()
  name: string;

  @IsDefined()
  @IsString()
  path: string;
}

export class SaveBulkMediaDto {
  @IsDefined()
  files: SaveBulkMediaItemDto[];

  @IsOptional()
  @IsString()
  categoryId?: string;
}
