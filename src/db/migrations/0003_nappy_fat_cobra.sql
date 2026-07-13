ALTER TABLE `activities` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `activities` SET `sort_order` = (
  SELECT COUNT(*) FROM `activities` a2
  WHERE (a2.category_id IS `activities`.`category_id`) AND a2.id <= `activities`.id
) - 1;--> statement-breakpoint
UPDATE `categories` SET `sort_order` = (
  SELECT COUNT(*) FROM `categories` c2 WHERE c2.id <= `categories`.id
) - 1;