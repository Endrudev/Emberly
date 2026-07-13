// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo
// SQL is inlined as strings to avoid Metro asset import issues with .sql files.

const journal = {
  version: '7',
  dialect: 'sqlite',
  entries: [
    {
      idx: 0,
      version: '6',
      when: 1779964956655,
      tag: '0000_curly_blob',
      breakpoints: true,
    },
    {
      idx: 1,
      version: '6',
      when: 1782233263372,
      tag: '0001_jittery_snowbird',
      breakpoints: true,
    },
    {
      idx: 2,
      version: '6',
      when: 1783964791877,
      tag: '0002_shocking_jetstream',
      breakpoints: true,
    },
    {
      idx: 3,
      version: '6',
      when: 1783967255801,
      tag: '0003_nappy_fat_cobra',
      breakpoints: true,
    },
  ],
};

const m0000 = `CREATE TABLE \`activities\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`name\` text NOT NULL,
\t\`emoji\` text NOT NULL,
\t\`color\` text NOT NULL,
\t\`scheduled_days_mask\` integer DEFAULT 0 NOT NULL,
\t\`created_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
\t\`archived\` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`completions\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`activity_id\` integer NOT NULL,
\t\`date\` text NOT NULL,
\t\`completed_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
\tFOREIGN KEY (\`activity_id\`) REFERENCES \`activities\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`uniq_completion_activity_date\` ON \`completions\` (\`activity_id\`,\`date\`);--> statement-breakpoint
CREATE INDEX \`completion_date_idx\` ON \`completions\` (\`date\`);`;

const m0001 = `CREATE TABLE \`streak_freezes\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`date\` text NOT NULL,
\t\`created_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`uniq_streak_freeze_date\` ON \`streak_freezes\` (\`date\`);`;

const m0002 = `CREATE TABLE \`categories\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`name\` text NOT NULL,
\t\`created_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
ALTER TABLE \`activities\` ADD \`category_id\` integer REFERENCES \`categories\`(\`id\`) ON DELETE SET NULL;`;

const m0003 = `ALTER TABLE \`activities\` ADD \`sort_order\` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE \`categories\` ADD \`sort_order\` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE \`activities\` SET \`sort_order\` = (
  SELECT COUNT(*) FROM \`activities\` a2
  WHERE (a2.category_id IS \`activities\`.\`category_id\`) AND a2.id <= \`activities\`.id
) - 1;
--> statement-breakpoint
UPDATE \`categories\` SET \`sort_order\` = (
  SELECT COUNT(*) FROM \`categories\` c2 WHERE c2.id <= \`categories\`.id
) - 1;`;

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
  },
};
