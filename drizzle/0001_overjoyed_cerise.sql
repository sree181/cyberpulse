CREATE TABLE `threat_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` varchar(64) NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`attackType` varchar(64) NOT NULL,
	`severity` varchar(16) NOT NULL,
	`sourceIp` varchar(45) NOT NULL,
	`sourceCountry` varchar(64) NOT NULL,
	`sourceCity` varchar(128),
	`sourceLat` text NOT NULL,
	`sourceLng` text NOT NULL,
	`targetName` varchar(128),
	`targetLat` text NOT NULL,
	`targetLng` text NOT NULL,
	`port` int,
	`protocol` varchar(16),
	CONSTRAINT `threat_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `timeline_bins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`binStart` timestamp NOT NULL,
	`eventCount` int NOT NULL DEFAULT 0,
	`criticalCount` int NOT NULL DEFAULT 0,
	`highCount` int NOT NULL DEFAULT 0,
	`mediumCount` int NOT NULL DEFAULT 0,
	`lowCount` int NOT NULL DEFAULT 0,
	CONSTRAINT `timeline_bins_id` PRIMARY KEY(`id`)
);
