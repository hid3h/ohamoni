-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "line_user_id" TEXT NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "getting_ups" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "got_up_at" TIMESTAMP(3) NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "getting_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_notification_settings" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "reminder_time" TEXT NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_notification_setting_cancellations" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "cancelled_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_notification_setting_cancellations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "getting_up_daily_summaries" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "jst_date" TEXT NOT NULL,
    "jst_time" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "getting_up_daily_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_line_user_id_key" ON "accounts"("line_user_id");

-- CreateIndex
CREATE INDEX "getting_ups_account_id_got_up_at_idx" ON "getting_ups"("account_id", "got_up_at");

-- CreateIndex
CREATE UNIQUE INDEX "getting_up_daily_summaries_account_id_jst_date_key" ON "getting_up_daily_summaries"("account_id", "jst_date");

-- AddForeignKey
ALTER TABLE "getting_ups" ADD CONSTRAINT "getting_ups_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_notification_settings" ADD CONSTRAINT "reminder_notification_settings_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_notification_setting_cancellations" ADD CONSTRAINT "reminder_notification_setting_cancellations_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "getting_up_daily_summaries" ADD CONSTRAINT "getting_up_daily_summaries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
