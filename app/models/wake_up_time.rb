class WakeUpTime < ApplicationRecord
  belongs_to :user

  class << self
    def wake_up(line_user_id:)
      user = User.find_or_create_by_line_user_id(line_user_id: line_user_id)
      user.wake_up_times.create(
        woke_up_on: Time.zone.today, # https://qiita.com/jnchito/items/cae89ee43c30f5d6fa2c#date%E3%81%AE%E5%A0%B4%E5%90%88
        woke_up_at: Time.zone.now
      )
    end
  end
end
