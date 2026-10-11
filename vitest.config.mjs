export default {
  resolve: {
    alias: {
      "@": `${process.cwd()}/src`,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
};
