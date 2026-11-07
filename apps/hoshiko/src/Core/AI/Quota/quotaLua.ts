export const CONSUME_OR_REFRESH_LUA = `
local key = KEYS[1]
local qType = ARGV[1]
local maxCap = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local cycleDur = tonumber(ARGV[4])

local balanceKey = qType .. "_balance"
local consumedKey = qType .. "_consumed"
local startKey = qType .. "_start"

local balance = redis.call("HGET", key, balanceKey)
local consumed = redis.call("HGET", key, consumedKey)
local cycleStart = redis.call("HGET", key, startKey)

if not balance then
  balance = maxCap
  consumed = 0
  cycleStart = now
  redis.call("HSET", key, balanceKey, balance, consumedKey, consumed, startKey, cycleStart)
else
  balance = tonumber(balance)
  consumed = tonumber(consumed)
  cycleStart = tonumber(cycleStart)
end

-- Comprobar si el ciclo de 24h venció para reposición parcial exacta
if (now - cycleStart) >= cycleDur then
  balance = math.min(maxCap, balance + consumed)
  consumed = 0
  cycleStart = now
  redis.call("HSET", key, balanceKey, balance, consumedKey, consumed, startKey, cycleStart)
end

-- Intentar consumir 1 unidad
if balance >= 1 then
  balance = balance - 1
  consumed = consumed + 1
  redis.call("HSET", key, balanceKey, balance, consumedKey, consumed)
  redis.call("EXPIRE", key, 172800) -- TTL de 48h
  return {1, balance, consumed, cycleStart}
else
  return {0, balance, consumed, cycleStart}
end
`;

export const ROLLBACK_LUA = `
local key = KEYS[1]
local qType = ARGV[1]
local maxCap = tonumber(ARGV[2])

local balanceKey = qType .. "_balance"
local consumedKey = qType .. "_consumed"

local balance = redis.call("HGET", key, balanceKey)
local consumed = redis.call("HGET", key, consumedKey)

if balance and consumed then
  balance = math.min(maxCap, tonumber(balance) + 1)
  consumed = math.max(0, tonumber(consumed) - 1)
  redis.call("HSET", key, balanceKey, balance, consumedKey, consumed)
  return 1
end

return 0
`;

export const GET_STATUS_LUA = `
local key = KEYS[1]
local qType = ARGV[1]
local maxCap = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local cycleDur = tonumber(ARGV[4])

local balanceKey = qType .. "_balance"
local consumedKey = qType .. "_consumed"
local startKey = qType .. "_start"

local balance = redis.call("HGET", key, balanceKey)
local consumed = redis.call("HGET", key, consumedKey)
local cycleStart = redis.call("HGET", key, startKey)

if not balance then
  balance = maxCap
  consumed = 0
  cycleStart = now
else
  balance = tonumber(balance)
  consumed = tonumber(consumed)
  cycleStart = tonumber(cycleStart)
end

if (now - cycleStart) >= cycleDur then
  balance = math.min(maxCap, balance + consumed)
  consumed = 0
  cycleStart = now
  redis.call("HSET", key, balanceKey, balance, consumedKey, consumed, startKey, cycleStart)
end

return {balance, consumed, cycleStart}
`;
