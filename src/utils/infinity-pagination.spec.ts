import { infinityPagination } from './infinity-pagination';

describe('infinityPagination', () => {
  it('should report another page when the page is full', () => {
    expect(infinityPagination([1, 2, 3], { page: 1, limit: 3 })).toEqual({
      data: [1, 2, 3],
      hasNextPage: true,
    });
  });

  it('should report the last page when fewer items than the limit are returned', () => {
    expect(infinityPagination(['a', 'b'], { page: 2, limit: 3 })).toEqual({
      data: ['a', 'b'],
      hasNextPage: false,
    });
  });

  it('should treat an empty page as the end of the collection', () => {
    expect(infinityPagination([], { page: 1, limit: 10 })).toEqual({
      data: [],
      hasNextPage: false,
    });
  });
});
