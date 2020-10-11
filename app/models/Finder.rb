class Finder

  WAKE_UP_MESSAGE = '起きた'

  class << self
    def excuse(events: [])
      event = events[0]
      text = event['message']['text']

      case text
      when WAKE_UP_MESSAGE then
        message_hash = WakeUpTime.wake_up(line_user_id: event['source']['userId'])
        
        line_bot_client.reply_message(
          reply_token: event['replyToken'],
          message: message_hash
        )
      end
    end

    private

    def line_bot_client
      @line_bot_client ||= LineBotClient.new
    end
  end
end
