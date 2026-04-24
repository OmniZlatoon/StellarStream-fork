import cron from "node-cron";
import { PriceService } from "./services/price.service.js";
import { TvlAggregatorService } from "./services/tvl-aggregator.service.js";
import { AssetMetadataService } from "./services/asset-metadata.service.js";
import { StellarExpertEnrichmentWorker } from "./services/stellar-expert-enrichment.service.js";
import { DisbursementArchivalWorker } from "./workers/disbursement-archival.worker.js";
import { logger } from "./logger.js";

const priceService = new PriceService();
const tvlService = new TvlAggregatorService();
const assetService = new AssetMetadataService();
const stellarExpertWorker = new StellarExpertEnrichmentWorker();
const disbursementArchiver = new DisbursementArchivalWorker();

/**
 * Update prices every 5 minutes (300 seconds)
 */
export function schedulePriceUpdates() {
  cron.schedule("*/5 * * * *", async () => {
    try {
      logger.info("Starting scheduled price update");
      await priceService.updateAllPrices();
      logger.info("Price update completed");
    } catch (error) {
      logger.error("Failed to update prices in scheduled task", error);
    }
  });

  logger.info("Price update scheduler started (every 5 minutes)");
}

/**
 * Update global stats every 10 minutes
 */
export function scheduleGlobalStatsUpdate() {
  cron.schedule("*/10 * * * *", async () => {
    try {
      logger.info("Starting scheduled global stats aggregation");
      await tvlService.aggregateStats();
      logger.info("Global stats aggregation completed");
    } catch (error) {
      logger.error("Failed to aggregate stats in scheduled task", error);
    }
  });

  logger.info("Global stats scheduler started (every 10 minutes)");
}

/**
 * Save daily TVL snapshot at midnight UTC
 */
export function scheduleDailyTvlSnapshot() {
  cron.schedule("0 0 * * *", async () => {
    try {
      logger.info("Starting daily TVL snapshot");
      await tvlService.saveDailySnapshot();
      logger.info("Daily TVL snapshot completed");
    } catch (error) {
      logger.error("Failed to save daily TVL snapshot", error);
    }
  });

  logger.info("Daily TVL snapshot scheduler started (midnight UTC)");
}

/**
 * Discover new asset metadata every 6 hours
 */
export function scheduleAssetDiscovery() {
  cron.schedule("0 */6 * * *", async () => {
    try {
      logger.info("Starting scheduled asset discovery");
      await assetService.discoverNewAssets();
      logger.info("Asset discovery completed");
    } catch (error) {
      logger.error("Failed to discover new assets in scheduled task", error);
    }
  });

  logger.info("Asset discovery scheduler started (every 6 hours)");
}

/**
 * Enrich assets with Stellar-Expert data every 12 hours
 */
export function scheduleStellarExpertEnrichment() {
  cron.schedule("0 */12 * * *", async () => {
    try {
      logger.info("Starting Stellar-Expert enrichment");
      await stellarExpertWorker.enrichBatch();
      logger.info("Stellar-Expert enrichment completed");
    } catch (error) {
      logger.error("Failed to enrich assets in scheduled task", error);
    }
  });

  logger.info("Stellar-Expert enrichment scheduler started (every 12 hours)");
}

/**
 * Archive old disbursements monthly (1st of month at 3 AM UTC)
 */
export function scheduleDisbursementArchival() {
  cron.schedule("0 3 1 * *", async () => {
    try {
      logger.info("Starting disbursement archival");
      const archived = await disbursementArchiver.archiveOldDisbursements();
      logger.info("Disbursement archival completed", { archived });
    } catch (error) {
      logger.error("Failed to archive disbursements in scheduled task", error);
    }
  });

  logger.info("Disbursement archival scheduler started (monthly on 1st at 3 AM UTC)");
}

/**
 * Initialize all scheduled tasks
 */
export function initializeSchedulers() {
  schedulePriceUpdates();
  scheduleGlobalStatsUpdate();
  scheduleDailyTvlSnapshot();
  scheduleAssetDiscovery();
  scheduleStellarExpertEnrichment();
  scheduleDisbursementArchival();
}
