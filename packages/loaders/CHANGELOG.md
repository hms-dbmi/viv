# @vivjs/loaders

## Unreleased

### Minor Changes

- TIFF loading now ships a custom `Pool` (exported from `@vivjs/loaders` / `@hms-dbmi/viv`) that matches geotiff’s pool job protocol (`jobId`) and always sends decode jobs to Web Workers when the pool size is non-zero—unlike geotiff’s built-in pool, which can skip workers for some compression paths. Requires `geotiff` 2.1.4-beta.0; apps bundling Viv should use a single `geotiff` instance (for example Vite `resolve.dedupe: ['geotiff']`) so main thread and workers share decoder registration. See [hms-dbmi/viv#949](https://github.com/hms-dbmi/viv/issues/949).

## 0.20.0

### Patch Changes

- Updated dependencies []:
  - @vivjs/types@0.20.0

## 0.19.0

### Patch Changes

- Updated dependencies []:
  - @vivjs/types@0.19.0

## 0.18.2

### Patch Changes

- Updated dependencies []:
  - @vivjs/types@0.18.2

## 0.18.1

### Patch Changes

- Updated dependencies []:
  - @vivjs/types@0.18.1

## 0.18.0

### Patch Changes

- Updated dependencies []:
  - @vivjs/types@0.18.0

## 0.17.3

### Patch Changes

- Updated dependencies []:
  - @vivjs/types@0.17.3

## 0.17.2

### Patch Changes

- Updated dependencies []:
  - @vivjs/types@0.17.2

## 0.17.1

### Patch Changes

- Updated dependencies []:
  - @vivjs/types@0.17.1

## 0.17.0

### Patch Changes

- Updated dependencies []:
  - @vivjs/types@0.17.0

## 0.16.1

### Patch Changes

- Updated dependencies []:
  - @vivjs/types@0.16.1

## 0.16.0

### Patch Changes

- Updated dependencies []:
  - @vivjs/types@0.16.0

## 0.15.1

### Patch Changes

- Updated dependencies []:
  - @vivjs/types@0.15.1
