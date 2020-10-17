class WakeUpTime < ApplicationRecord
  belongs_to :user

  scope :recently, -> { order(woke_up_on: 'DESC') }
  # 先週の同じ曜日もみたいので実際は8日分
  scope :last_week, -> { where('woke_up_on <= ?', Time.zone.today).where('woke_up_on >= ?', Time.zone.today - 7.day) }

  class << self
    def wake_up(line_user_id:)
      user = User.find_or_create_by_line_user_id(line_user_id: line_user_id)

      text = 'おはようございます'
      begin
        user.wake_up_times.create(
          woke_up_on: Time.zone.today, # https://qiita.com/jnchito/items/cae89ee43c30f5d6fa2c#date%E3%81%AE%E5%A0%B4%E5%90%88
          woke_up_at: Time.zone.now
        )
      rescue ActiveRecord::RecordNotUnique
        text = '今日は既に記録済みです'
      end

      # 直近一週間取得
      weekly_data = user.wake_up_times.last_week.recently
      weekly_data_messages = weekly_data.map do |data|
        '・' + data.woke_up_on.day.to_s + '(' + %w(日 月 火 水 木 金 土)[data.woke_up_on.wday] + ')' + data.woke_up_at.strftime("%H:%M")
      end

      {
        type: 'text',
        text: text + "\n\n直近の一週間の記録です\n" + weekly_data_messages.join("\n")
      }
    end
  end
end
