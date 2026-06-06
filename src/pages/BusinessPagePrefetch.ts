type BusinessPageModule = typeof import("@/pages/BusinessPage");

let loadedBusinessPageModule: BusinessPageModule | null = null;
let loadingBusinessPageModule: Promise<BusinessPageModule> | null = null;

export function preloadBusinessPageChunk() {
  if (loadedBusinessPageModule) {
    return Promise.resolve(loadedBusinessPageModule);
  }

  if (!loadingBusinessPageModule) {
    loadingBusinessPageModule = import("@/pages/BusinessPage").then((module) => {
      loadedBusinessPageModule = module;
      return module;
    });
  }

  return loadingBusinessPageModule;
}

export function getLoadedBusinessPageModule() {
  return loadedBusinessPageModule;
}
