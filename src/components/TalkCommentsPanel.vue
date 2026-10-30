<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  appendTalkComment,
  parseTalkComments,
} from '@/lib/lichen/talk-comments'
import { formatNotificationTime } from '@/lib/notifications'

const props = defineProps<{
  content: string
  canEdit: boolean
}>()

const emit = defineEmits<{
  save: [content: string]
}>()

const auth = useAuthStore()
const draft = ref('')
const saving = ref(false)

const comments = computed(() => parseTalkComments(props.content))

async function submit() {
  if (!props.canEdit || !draft.value.trim() || !auth.handle) return
  saving.value = true
  try {
    const next = appendTalkComment(props.content, auth.handle, draft.value.trim())
    emit('save', next)
    draft.value = ''
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="talk-comments card">
    <h2>Thread</h2>
    <ul v-if="comments.length" class="comment-list">
      <li v-for="(comment, idx) in comments" :key="`${comment.createdAt}-${idx}`">
        <header>
          <strong>@{{ comment.authorHandle }}</strong>
          <span class="muted">{{ formatNotificationTime(comment.createdAt) }}</span>
        </header>
        <p class="comment-body">{{ comment.body }}</p>
        <p v-if="comment.mentions.length" class="mentions muted">
          Mentions:
          <span v-for="handle in comment.mentions" :key="handle">@{{ handle }} </span>
        </p>
      </li>
    </ul>
    <p v-else class="muted">No comments yet. Start the thread below.</p>

    <form v-if="canEdit" class="comment-form" @submit.prevent="submit">
      <label class="label" for="talk-comment">Add a comment</label>
      <textarea
        id="talk-comment"
        v-model="draft"
        class="input"
        rows="3"
        placeholder="Share feedback… use @handle to mention someone"
      />
      <button type="submit" class="btn btn-secondary btn-sm" :disabled="saving || !draft.trim()">
        {{ saving ? 'Posting…' : 'Post comment' }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.talk-comments {
  margin-top: 2rem;
  padding: 1rem 1.25rem;
  display: grid;
  gap: 0.75rem;
}

h2 {
  margin: 0;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--pckt-text-muted);
}

.comment-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.comment-list li {
  padding: 0.75rem;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
}

.comment-list header {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  margin-bottom: 0.35rem;
  font-size: 0.8125rem;
}

.comment-body {
  margin: 0;
  white-space: pre-wrap;
}

.mentions {
  margin: 0.35rem 0 0;
  font-size: 0.75rem;
}

.comment-form {
  display: grid;
  gap: 0.5rem;
}
</style>
