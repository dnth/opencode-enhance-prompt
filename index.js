const PLUGIN_ID = "enhance-prompt"
const DEFAULT_BINDING = "<leader>w"
const FALLBACK_BINDING = "<leader>shift+w"
const DEFAULT_BINDING_LABEL = "ctrl+x w"
const DEFAULT_PROVIDER_ID = "opencode"
const DEFAULT_MODEL_ID = "deepseek-v4-flash-free"
const FALLBACK_MODEL_IDS = ["big-pickle", "minimax-m2.5-free", "nemotron-3-super-free", "qwen3.6-plus-free"]
const MOCK_TEXT_ENV = "OPENCODE_ENHANCE_MOCK_TEXT"
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

function resolveModel(options) {
  if (options?.providerID && options?.modelID) return { providerID: options.providerID, modelID: options.modelID }
  if (!options?.model) return { providerID: DEFAULT_PROVIDER_ID, modelID: DEFAULT_MODEL_ID }

  const separator = options.model.indexOf("/")
  if (separator === -1) return { providerID: DEFAULT_PROVIDER_ID, modelID: options.model }
  if (separator === 0 || separator === options.model.length - 1) throw new Error('Set model as "provider/model" or a bare opencode model ID')

  return {
    providerID: options.model.slice(0, separator),
    modelID: options.model.slice(separator + 1),
  }
}

function enhancementModels(options) {
  const configured = options?.providerID || options?.modelID || options?.model
  if (configured) return [resolveModel(options)]

  return [DEFAULT_MODEL_ID, ...FALLBACK_MODEL_IDS].map((modelID) => ({ providerID: DEFAULT_PROVIDER_ID, modelID }))
}

function errorMessage(value) {
  if (!value) return undefined
  if (typeof value === "string") return value
  if (value instanceof Error) return value.message
  if (typeof value.message === "string") return value.message
  if (typeof value.error === "string") return value.error
  if (typeof value.error?.message === "string") return value.error.message
  if (typeof value.data?.message === "string") return value.data.message
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function resultData(result, action) {
  if (result?.error) throw new Error(errorMessage(result.error) || `${action} failed`)
  if (!result?.data) throw new Error(`${action} returned no data`)
  return result.data
}

function ensureModelAvailable(api, model) {
  const providers = api.state?.provider
  if (!Array.isArray(providers) || providers.length === 0) return

  const provider = providers.find((item) => item.id === model.providerID)
  if (!provider) {
    throw new Error(`OpenCode provider "${model.providerID}" is not connected. Connect it with /connect or configure a different enhancement model.`)
  }

  if (provider.models && !provider.models[model.modelID]) {
    throw new Error(`Model "${model.providerID}/${model.modelID}" is not available in OpenCode. Configure a different enhancement model in tui.json.`)
  }
}

function extractEnhancedText(message) {
  const enhanced = (message?.parts ?? [])
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim()

  if (!enhanced) throw new Error("OpenCode provider returned an empty prompt")
  return enhanced
}

async function requestEnhancedPrompt(original, api, options) {
  if (process.env[MOCK_TEXT_ENV]) return process.env[MOCK_TEXT_ENV]
  if (!api.client?.session?.create || !api.client?.session?.prompt) throw new Error("OpenCode provider client is unavailable")

  const models = enhancementModels(options)
  const agent = options?.agent
  const failures = []

  for (const model of models) {
    let sessionID
    try {
      ensureModelAvailable(api, model)

      const session = resultData(
        await api.client.session.create({
          title: "Prompt enhancement",
          ...(agent ? { agent } : {}),
          model: { providerID: model.providerID, id: model.modelID },
        }),
        "Creating enhancement session",
      )
      sessionID = session.id

      const message = resultData(
        await api.client.session.prompt({
          sessionID,
          system: SYSTEM_PROMPT,
          parts: [{ type: "text", text: original }],
          ...(agent ? { agent } : {}),
          model,
        }),
        "Prompt enhancement",
      )
      return extractEnhancedText(message)
    } catch (error) {
      failures.push(`${model.providerID}/${model.modelID}: ${errorMessage(error) || "failed"}`)
    } finally {
      if (sessionID && api.client.session.delete) await api.client.session.delete({ sessionID }).catch(() => undefined)
    }
  }

  throw new Error(`Prompt enhancement failed for all fallback models. ${failures.join("; ")}`)
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
            const enhanced = await requestEnhancedPrompt(original, api, options)
            ref.set({ input: enhanced.trim(), parts: [] })
            toast(api, "success", "Prompt enhanced")
          } catch (error) {
            toast(api, "error", errorMessage(error) || "Prompt enhancement failed")
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
