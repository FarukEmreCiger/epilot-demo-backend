
export const config = {
  region: "europe-west1",
  projectId: "epilot-demo-project",
  queueName: "guess-resolution-queue",
  location: "europe-west1",
  guessResolutionDelaySeconds: "60",
  serviceAccountEmailForCloudTasks: "cloud-tasks-invoker@epilot-demo-project.iam.gserviceaccount.com",
  lockTTL: 3000,
} as const;
