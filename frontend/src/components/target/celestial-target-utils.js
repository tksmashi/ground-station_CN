const MAX_TARGET_PASS_HOURS = 24;

export const normalizeTargetType = (trackingState = {}) => {
    const explicitType = String(trackingState?.target_type || '').trim().toLowerCase();
    if (explicitType === 'satellite' || explicitType === 'mission' || explicitType === 'body') {
        return explicitType;
    }
    if (String(trackingState?.command || '').trim()) return 'mission';
    if (String(trackingState?.body_id || '').trim()) return 'body';
    return 'satellite';
};

export const clampTargetPassHours = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return MAX_TARGET_PASS_HOURS;
    }
    return Math.min(MAX_TARGET_PASS_HOURS, parsed);
};

export const buildTargetKeyFromTrackingState = (trackingState = {}) => {
    const targetType = normalizeTargetType(trackingState);
    if (targetType === 'mission') {
        const command = String(trackingState?.command || '').trim();
        return command ? `mission:${command}` : '';
    }
    if (targetType === 'body') {
        const bodyId = String(trackingState?.body_id || '').trim().toLowerCase();
        return bodyId ? `body:${bodyId}` : '';
    }
    return '';
};

export const buildTargetCelestialPayload = ({
    trackingState = {},
    targetName = '',
    nextPassesHours = MAX_TARGET_PASS_HOURS,
} = {}) => {
    const targetType = normalizeTargetType(trackingState);
    if (targetType === 'satellite') {
        return null;
    }

    const futureHours = clampTargetPassHours(nextPassesHours);
    const sharedPayload = {
        past_hours: 0,
        future_hours: futureHours,
        step_minutes: 60,
    };

    if (targetType === 'mission') {
        const command = String(trackingState?.command || '').trim();
        if (!command) return null;
        return {
            ...sharedPayload,
            celestial: [
                {
                    target_type: 'mission',
                    command,
                    name: String(targetName || command).trim() || command,
                },
            ],
        };
    }

    const bodyId = String(trackingState?.body_id || '').trim().toLowerCase();
    if (!bodyId) return null;
    return {
        ...sharedPayload,
        celestial: [
            {
                target_type: 'body',
                body_id: bodyId,
                name: String(targetName || bodyId).trim() || bodyId,
            },
        ],
    };
};

export const filterPassesForTargetWindow = ({
    passes = [],
    targetKey = '',
    nextPassesHours = MAX_TARGET_PASS_HOURS,
    nowMs = Date.now(),
} = {}) => {
    const key = String(targetKey || '').trim();
    if (!key) return [];
    const source = Array.isArray(passes) ? passes : [];
    const windowEndMs = nowMs + (clampTargetPassHours(nextPassesHours) * 3600 * 1000);

    return source
        .filter((pass) => String(pass?.target_key || '').trim() === key)
        .filter((pass) => {
            const startMs = new Date(pass?.event_start || '').getTime();
            const endMs = new Date(pass?.event_end || '').getTime();
            if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return false;
            if (endMs < nowMs) return false;
            return startMs <= windowEndMs;
        })
        .sort((left, right) => new Date(left.event_start).getTime() - new Date(right.event_start).getTime());
};

