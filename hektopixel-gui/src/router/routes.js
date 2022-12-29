const routes = [
  {
    path: "/",
    component: () => import("pages/Index.vue"),
  },
  {
    path: "/screen",
    component: () => import("pages/Screen.vue"),
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: "/:catchAll(.*)*",
    component: () => import("pages/Error404.vue"),
  },
];

export default routes;
