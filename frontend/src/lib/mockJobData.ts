/**
 * Mock job data based on real Bright Data scraping results from Montgomery, AL.
 * In production, this is replaced by live data from job_scraper_service.py webhook.
 */
import type { JobListing } from "./types";
import { healthcareJobs } from "./mockJobData/healthcareJobs";
import { manufacturingJobs } from "./mockJobData/manufacturingJobs";
import { retailJobs } from "./mockJobData/retailJobs";
import { transportJobs } from "./mockJobData/transportJobs";
import { officeJobs } from "./mockJobData/officeJobs";

export const MOCK_JOB_LISTINGS: JobListing[] = [
  ...healthcareJobs,
  ...retailJobs,
  ...manufacturingJobs,
  ...transportJobs,
  ...officeJobs,
];
