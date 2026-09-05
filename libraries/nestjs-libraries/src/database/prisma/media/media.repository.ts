import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { SaveMediaInformationDto } from '@gitroom/nestjs-libraries/dtos/media/save.media.information.dto';
import {
  CreateMediaCategoryDto,
  UpdateMediaCategoryDto,
} from '@gitroom/nestjs-libraries/dtos/media/media.category.dto';
import { SaveBulkMediaDto } from '@gitroom/nestjs-libraries/dtos/media/bulk.upload.media.dto';

const MEDIA_SELECT = {
  id: true,
  name: true,
  path: true,
  thumbnail: true,
  alt: true,
  categoryId: true,
};

@Injectable()
export class MediaRepository {
  constructor(
    private _media: PrismaRepository<'media'>,
    private _mediaCategory: PrismaRepository<'mediaCategory'>
  ) {}

  saveFile(
    org: string,
    fileName: string,
    filePath: string,
    categoryId?: string
  ) {
    return this._media.model.media.create({
      data: {
        organization: {
          connect: {
            id: org,
          },
        },
        name: fileName,
        path: filePath,
        ...(categoryId
          ? {
              category: {
                connect: {
                  id: categoryId,
                },
              },
            }
          : {}),
      },
      select: MEDIA_SELECT,
    });
  }

  async saveBulkFiles(org: string, data: SaveBulkMediaDto) {
    const { files, categoryId } = data;
    if (categoryId) {
      const category = await this._mediaCategory.model.mediaCategory.findFirst(
        {
          where: {
            id: categoryId,
            organizationId: org,
            deletedAt: null,
          },
        }
      );
      if (!category) {
        throw new Error('Category not found');
      }
    }

    return Promise.all(
      files.map((file) =>
        this._media.model.media.create({
          data: {
            organizationId: org,
            name: file.name,
            path: file.path,
            ...(categoryId ? { categoryId } : {}),
          },
          select: MEDIA_SELECT,
        })
      )
    );
  }

  getCategories(org: string) {
    return this._mediaCategory.model.mediaCategory.findMany({
      where: {
        organizationId: org,
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            media: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
    });
  }

  createCategory(org: string, data: CreateMediaCategoryDto) {
    return this._mediaCategory.model.mediaCategory.create({
      data: {
        name: data.name,
        organizationId: org,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  updateCategory(org: string, data: UpdateMediaCategoryDto) {
    return this._mediaCategory.model.mediaCategory.update({
      where: {
        id: data.id,
        organizationId: org,
      },
      data: {
        name: data.name,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  deleteCategory(org: string, id: string) {
    return this._mediaCategory.model.mediaCategory.updateMany({
      where: {
        id,
        organizationId: org,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  assignCategory(org: string, mediaId: string, categoryId?: string) {
    return this._media.model.media.update({
      where: {
        id: mediaId,
        organizationId: org,
      },
      data: {
        categoryId: categoryId || null,
      },
      select: MEDIA_SELECT,
    });
  }

  bulkAssignCategory(org: string, mediaIds: string[], categoryId?: string) {
    return this._media.model.media.updateMany({
      where: {
        id: {
          in: mediaIds,
        },
        organizationId: org,
      },
      data: {
        categoryId: categoryId || null,
      },
    });
  }

  getMediaById(id: string) {
    return this._media.model.media.findUnique({
      where: {
        id,
      },
    });
  }

  deleteMedia(org: string, id: string) {
    return this._media.model.media.update({
      where: {
        id,
        organizationId: org,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  saveMediaInformation(org: string, data: SaveMediaInformationDto) {
    return this._media.model.media.update({
      where: {
        id: data.id,
        organizationId: org,
      },
      data: {
        alt: data.alt,
        thumbnail: data.thumbnail,
        thumbnailTimestamp: data.thumbnailTimestamp,
      },
      select: {
        id: true,
        name: true,
        alt: true,
        thumbnail: true,
        path: true,
        thumbnailTimestamp: true,
      },
    });
  }

  async getMedia(org: string, page: number, categoryId?: string) {
    const pageNum = (page || 1) - 1;
    const query = {
      where: {
        organization: {
          id: org,
        },
        ...(categoryId ? { categoryId } : {}),
      },
    };
    const pages =
      pageNum === 0
        ? Math.ceil((await this._media.model.media.count(query)) / 28)
        : 0;
    const results = await this._media.model.media.findMany({
      where: {
        organizationId: org,
        deletedAt: null,
        ...(categoryId ? { categoryId } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        path: true,
        thumbnail: true,
        alt: true,
        thumbnailTimestamp: true,
        categoryId: true,
      },
      skip: pageNum * 28,
      take: 28,
    });

    return {
      pages,
      results,
    };
  }
}
