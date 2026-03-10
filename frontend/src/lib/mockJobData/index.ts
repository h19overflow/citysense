import type { JobListing } from "../types";
import { healthcareJobs } from "./healthcareJobs";
import { manufacturingJobs } from "./manufacturingJobs";
import { retailJobs } from "./retailJobs";
import { transportJobs } from "./transportJobs";
import { officeJobs } from "./officeJobs";

export const MOCK_JOB_LISTINGS: JobListing[] = [
  ...healthcareJobs,
  ...manufacturingJobs,
  ...retailJobs,
  ...transportJobs,
  ...officeJobs,
];

export { healthcareJobs, manufacturingJobs, retailJobs, transportJobs, officeJobs };
