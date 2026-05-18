const PLUGIN_ID = "enhance-prompt"
const DEFAULT_MODEL = "gpt-5-nano"
const DEFAULT_BINDING = "<leader>w"
const FALLBACK_BINDING = "<leader>shift+w"
const DEFAULT_BINDING_LABEL = "ctrl+x w"
const DEFAULT_API_KEY_FILE = "~/.config/opencode/secrets/openai-api-key"
const SYSTEM_PROMPT =
  "Rewrite the user's draft prompt for an AI coding agent. Preserve the original meaning exactly. Make it specific, actionable, and concise. Do not answer the prompt. Return only the rewritten prompt."

let activePromptRef
let enhancing = false

const promptRefs = {
  home: undefined,
  session: undefined,
}

function setPromptRef(slot, ref, upstreamRef) {
  if (typeof upstreamRef === "function") upstreamRef(ref)

  if (ref) {
    promptRefs[slot] = ref
    activePromptRef = ref
    return
  }

  const previous = promptRefs[slot]
  promptRefs[slot] = undefined
  if (activePromptRef === previous) {
    activePromptRef = promptRefs.session ?? promptRefs.home
  }
}

function getActivePromptRef() {
  return [activePromptRef, promptRefs.session, promptRefs.home].find((ref) => ref?.focused) ?? activePromptRef
}

function toast(api, variant, message) {
  api.ui.toast({ variant, message, duration: 3000 })
}

function bindingMatches(binding, key) {
  if (!binding) return false
  if (binding.key === key) return true
  if (binding.keys === key) return true
  if (binding.sequence === key) return true
  return JSON.stringify(binding).includes(key)
}

function pickBinding(api) {
  const existing = api.tuiConfig?.keybinds?.bindings ?? []
  if (existing.some((binding) => bindingMatches(binding, DEFAULT_BINDING) || bindingMatches(binding, DEFAULT_BINDING_LABEL))) return FALLBACK_BINDING
  return DEFAULT_BINDING
}

function resolveHomePath(path) {
  if (!path?.startsWith("~/")) return path
  return `${process.env.HOME}${path.slice(1)}`
}

async function readApiKeyFromFile(path) {
  if (!path) return undefined
  const { readFile } = await import("node:fs/promises")
  try {
    return (await readFile(resolveHomePath(path), "utf8")).trim()
  } catch (error) {
    if (error?.code === "ENOENT") return undefined
    throw new Error("OpenAI API key file could not be read")
  }
}

async function getApiKey(options) {
  return process.env.OPENAI_API_KEY || (await readApiKeyFromFile(options?.apiKeyFile || DEFAULT_API_KEY_FILE))
}

async function requestEnhancedPrompt(original, options) {
  if (process.env.OPENAI_ENHANCE_MOCK_TEXT) return process.env.OPENAI_ENHANCE_MOCK_TEXT

  const apiKey = await getApiKey(options)
  if (!apiKey) throw new Error("OpenAI API key is missing")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_ENHANCE_MODEL || options?.model || DEFAULT_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: original },
        ],
        temperature: 1,
        reasoning_effort: "minimal",
        max_completion_tokens: 2000,
      }),
      signal: controller.signal,
    })

    const data = await response.json()
    if (!response.ok) {
      const message = data?.error?.message || `OpenAI request failed with status ${response.status}`
      throw new Error(message)
    }

    const enhanced = data?.choices?.[0]?.message?.content?.trim()
    if (!enhanced) {
      const reason = data?.choices?.[0]?.finish_reason
      throw new Error(reason === "length" ? "OpenAI used the output token budget before returning text" : "OpenAI returned an empty prompt")
    }
    return enhanced
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("OpenAI request timed out")
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function registerPromptSlots(api) {
  api.slots.register({
    slots: {
      home_prompt(_ctx, props) {
        return api.ui.Prompt({
          workspaceID: props.workspace_id,
          ref: (ref) => setPromptRef("home", ref, props.ref),
          right: api.ui.Slot({ name: "home_prompt_right", workspace_id: props.workspace_id }),
        })
      },
      session_prompt(_ctx, props) {
        return api.ui.Prompt({
          sessionID: props.session_id,
          visible: props.visible,
          disabled: props.disabled,
          onSubmit: props.on_submit,
          ref: (ref) => setPromptRef("session", ref, props.ref),
          right: api.ui.Slot({ name: "session_prompt_right", session_id: props.session_id }),
        })
      },
    },
  })
}

function registerEnhanceCommand(api, options) {
  const key = pickBinding(api)

  api.keymap.registerLayer({
    commands: [
      {
        name: "prompt.enhance",
        title: "Enhance prompt",
        category: "Prompt",
        namespace: "palette",
        async run() {
          const ref = getActivePromptRef()
          if (!ref?.current) {
            toast(api, "warning", "No active prompt found")
            return
          }

          const original = ref.current.input ?? ""
          if (!original.trim()) {
            toast(api, "warning", "Type a prompt first")
            return
          }

          if (enhancing) {
            toast(api, "info", "Prompt enhancement already running")
            return
          }

          enhancing = true
          try {
            const enhanced = await requestEnhancedPrompt(original, options)
            ref.set({ input: enhanced.trim(), parts: [] })
            toast(api, "success", "Prompt enhanced")
          } catch (error) {
            toast(api, "error", error?.message || "Prompt enhancement failed")
          } finally {
            enhancing = false
          }
        },
      },
    ],
    bindings: [{ key, cmd: "prompt.enhance", desc: "Enhance prompt" }],
  })
}

const plugin = {
  id: PLUGIN_ID,
  tui: async (api, options) => {
    registerPromptSlots(api)
    registerEnhanceCommand(api, options)
  },
}

export default plugin
