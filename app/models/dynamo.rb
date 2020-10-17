require "aws-sdk"

class Dynamo
  def initialize(table_name:)
    @table_name = table_name
    Aws.config.update({
      region: "ap-northeast-1"
    })
    @dynamodb = Aws::DynamoDB::Client.new
  end

  def put_item(item: {}, option: {})
    params = {
      table_name: @table_name,
      item: item
    }
    @dynamodb.put_item(params.merge(option))
  end

  def query(condition: {})
    params = {
      table_name: @table_name,
    }
    params = params.merge(condition)
    p params
    @dynamodb.query(params)
  end
end
