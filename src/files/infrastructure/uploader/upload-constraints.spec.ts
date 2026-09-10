import {
  assertSafeStoredFilename,
  createRandomImageFilename,
  getAllowedImageExtension,
  isAllowedImageMimeType,
} from './upload-constraints';

describe('upload-constraints', () => {
  it('should accept image extensions and reject everything else', () => {
    expect(getAllowedImageExtension('photo.JPG')).toBe('jpg');
    expect(getAllowedImageExtension('photo.png')).toBe('png');
    expect(getAllowedImageExtension('notes.pdf')).toBeNull();
    expect(getAllowedImageExtension('../secret.jpg')).toBeNull();
    expect(getAllowedImageExtension('dir/photo.jpg')).toBeNull();
  });

  it('should accept only image MIME types', () => {
    expect(isAllowedImageMimeType('image/jpeg')).toBe(true);
    expect(isAllowedImageMimeType('image/png')).toBe(true);
    expect(isAllowedImageMimeType('application/pdf')).toBe(false);
    expect(isAllowedImageMimeType(undefined)).toBe(false);
  });

  it('should generate a random storage key that keeps the allowed extension', () => {
    const name = createRandomImageFilename('avatar.PNG');
    expect(name.endsWith('.png')).toBe(true);
    expect(name).not.toContain('avatar');
    expect(name.split('.')[0]?.length).toBeGreaterThan(8);
  });

  it('should reject stored filenames that can escape the files directory', () => {
    expect(assertSafeStoredFilename('abc.jpg')).toBe('abc.jpg');
    expect(() => assertSafeStoredFilename('../etc/passwd')).toThrow();
    expect(() => assertSafeStoredFilename('nested/file.jpg')).toThrow();
  });
});
