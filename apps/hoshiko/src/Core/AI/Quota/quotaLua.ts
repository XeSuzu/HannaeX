/**
 * CONSUME_OR_REFRESH_LUA
 * KEYS[1]: ai_quota:{userId}
 * ARGV[1]: qType ("conversation" | "research")
 * ARGV[2]: maxCap (40 | 20)
 * ARGV[3]: now (epoch ms)
 * ARGV[4]: currentCycleStart (epoch ms de las 00:00 Ecuador del día actual)
 */
export const CONSUME_OR_REFRESH_LUA = `
local key = KEYS[1]
local qType = ARGV[1]
local maxCap = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local currentCycleStart = tonumber(ARGV[4])

local balanceKey = qType .. "_balance"
local consumedKey = qType .. "_consumed"
local startKey = qType .. "_start"

local balance = redis.call("HGET", key, balanceKey)
local consumed = redis.call("HGET", key, consumedKey)
local storedStart = redis.call("HGET", key, startKey)

if not balance or not storedStart then
  balance = maxCap
  consumed = 0
  storedStart = currentCycleStart
  redis.call("HSET", key, balanceKey, balance, consumedKey, consumed, startKey, storedStart)
else
  balance = tonumber(balance)
  consumed = tonumber(consumed)
  storedStart = tonumber(storedStart)
end

-- Reinicio diario estricto a las 00:00 de Ecuador (America/Guayaquil)
if storedStart < currentCycleStart then
  balance = maxCap
  consumed = 0
  storedStart = currentCycleStart
  redis.call("HSET", key, balanceKey, balance, consumedKey, consumed, startKey, storedStart)
end

-- Intentar consumir 1 unidad atómica
if balance >= 1 then
  balance = balance - 1
  consumed = consumed + 1
  redis.call("HSET", key, balanceKey, balance, consumedKey, consumed)
  redis.call("EXPIRE", key, 172800) -- TTL de 48h
  return {1, balance, consumed, storedStart}
else
  return {0, balance, consumed, storedStart}
end
`;

/**
 * ROLLBACK_LUA
 * KEYS[1]: ai_quota:{userId}
 * ARGV[1]: qType ("conversation" | "research")
 * ARGV[2]: maxCap (40 | 20)
 */
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

/**
 * GET_STATUS_LUA
 * KEYS[1]: ai_quota:{userId}
 * ARGV[1]: qType ("conversation" | "research")
 * ARGV[2]: maxCap (40 | 20)
 * ARGV[3]: now (epoch ms)
 * ARGV[4]: currentCycleStart (epoch ms de las 00:00 Ecuador del día actual)
 */
export const GET_STATUS_LUA = `
local key = KEYS[1]
local qType = ARGV[1]
local maxCap = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local currentCycleStart = tonumber(ARGV[4])

local balanceKey = qType .. "_balance"
local consumedKey = qType .. "_consumed"
local startKey = qType .. "_start"

local balance = redis.call("HGET", key, balanceKey)
local consumed = redis.call("HGET", key, consumedKey)
local storedStart = redis.call("HGET", key, startKey)

if not balance or not storedStart then
  balance = maxCap
  consumed = 0
  storedStart = currentCycleStart
else
  balance = tonumber(balance)
  consumed = tonumber(consumed)
  storedStart = tonumber(storedStart)
end

-- Reinicio diario estricto a las 00:00 de Ecuador
if storedStart < currentCycleStart then
  balance = maxCap
  consumed = 0
  storedStart = currentCycleStart
  redis.call("HSET", key, balanceKey, balance, consumedKey, consumed, startKey, storedStart)
end

return {balance, consumed, storedStart}
`;
