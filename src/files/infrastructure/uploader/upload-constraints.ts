import { HttpStatus, UnprocessableEntityException } from '@nestjs/common';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import type { Request } from 'express';
import path from 'node:path';

export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif'] as const;
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
] as const;

export const UPLOAD_FILE_COUNT_LIMIT = 1;

type MulterFileLike = {
  originalname: string;
  mimetype?: string;
};

function rejectUpload(
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  callback(
    new UnprocessableEntityException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: {
        file: 'cantUploadFileType',
      },
    }),
    false,
  );
}

export function getAllowedImageExtension(originalname: string): string | null {
  if (
    !originalname ||
    originalname.includes('/') ||
    originalname.includes('\\')
  ) {
    return null;
  }

  const ext = originalname.split('.').pop()?.toLowerCase();
  if (!ext || !(ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(ext)) {
    return null;
  }

  return ext;
}

export function isAllowedImageMimeType(mimetype: string | undefined): boolean {
  return (
    !!mimetype &&
    (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mimetype)
  );
}

export function createRandomImageFilename(originalname: string): string {
  const ext = getAllowedImageExtension(originalname);
  if (!ext) {
    throw new UnprocessableEntityException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: {
        file: 'cantUploadFileType',
      },
    });
  }

  return `${randomStringGenerator()}.${ext}`;
}

export function createImageFileFilter() {
  return (
    _request: Request,
    file: MulterFileLike,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ): void => {
    if (
      !getAllowedImageExtension(file.originalname) ||
      !isAllowedImageMimeType(file.mimetype)
    ) {
      rejectUpload(callback);
      return;
    }

    callback(null, true);
  };
}

export function createRandomImageStorageName() {
  return (
    _request: Request,
    file: MulterFileLike,
    callback: (error: Error | null, filename: string) => void,
  ): void => {
    try {
      callback(null, createRandomImageFilename(file.originalname));
    } catch (error) {
      callback(error as Error, '');
    }
  };
}

export function assertSafeStoredFilename(filename: string): string {
  const baseName = path.basename(filename);
  if (
    !filename ||
    filename !== baseName ||
    filename.includes('..') ||
    filename.includes('/') ||
    filename.includes('\\')
  ) {
    throw new UnprocessableEntityException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: {
        file: 'invalidFilePath',
      },
    });
  }

  return filename;
}
