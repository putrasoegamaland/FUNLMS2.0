/**
 * HOTS QC Routing Rules
 * Determines whether a question should be auto-approved or sent to admin queue
 */

/**
 * Check if a question should be routed to admin queue
 * Returns { requiresAdmin: boolean, reasons: string[] }
 */
export function checkRoutingRules(question, aiReview) {
    const reasons = [];

    if (!aiReview) {
        return { requiresAdmin: true, reasons: ['AI review not available'] };
    }

    // Rule 1: Teacher says Easy but AI difficulty >= 7
    if (question.teacher_difficulty === 'easy' && aiReview.difficulty_score >= 7) {
        reasons.push(`Teacher marked Easy but AI scored ${aiReview.difficulty_score}/10 (Hard)`);
    }

    // Rule 2: Teacher says Hard but AI difficulty <= 3
    if (question.teacher_difficulty === 'hard' && aiReview.difficulty_score <= 3) {
        reasons.push(`Teacher marked Hard but AI scored ${aiReview.difficulty_score}/10 (Easy)`);
    }

    // Rule 3: Teacher claims HOTS but AI says low Bloom or weak HOTS
    if (question.teacher_hots_claim) {
        if (aiReview.primary_bloom_level <= 3) {
            reasons.push(`Teacher claims HOTS but AI detected Bloom level ${aiReview.primary_bloom_level} (not HOTS)`);
        } else if (aiReview.hots_strength === 'S0') {
            reasons.push('Teacher claims HOTS but AI detected weak HOTS (S0)');
        }
    }

    // Rule 4: Boundedness is B0 (bad)
    if (aiReview.boundedness === 'B0') {
        reasons.push('Boundedness is B0 (insufficient information or ambiguous grading)');
    }

    // Rule 5: Any ambiguity or missing info flags
    if (aiReview.ambiguity_flags?.length > 0) {
        reasons.push(`Ambiguity detected: ${aiReview.ambiguity_flags.join(', ')}`);
    }

    if (aiReview.missing_info_flags?.length > 0) {
        reasons.push(`Missing information: ${aiReview.missing_info_flags.join(', ')}`);
    }

    // Rule 6: Any confidence metric < 0.65
    const confidenceThreshold = 0.65;
    if (aiReview.bloom_confidence < confidenceThreshold) {
        reasons.push(`Low confidence in Bloom classification (${(aiReview.bloom_confidence * 100).toFixed(0)}%)`);
    }
    if (aiReview.hots_confidence < confidenceThreshold) {
        reasons.push(`Low confidence in HOTS classification (${(aiReview.hots_confidence * 100).toFixed(0)}%)`);
    }
    if (aiReview.difficulty_confidence < confidenceThreshold) {
        reasons.push(`Low confidence in difficulty classification (${(aiReview.difficulty_confidence * 100).toFixed(0)}%)`);
    }
    if (aiReview.boundedness_confidence < confidenceThreshold) {
        reasons.push(`Low confidence in boundedness classification (${(aiReview.boundedness_confidence * 100).toFixed(0)}%)`);
    }

    // Rule 7: Grade fit issues
    if (aiReview.grade_fit_flags?.length > 0) {
        reasons.push(`Grade fit issues: ${aiReview.grade_fit_flags.join(', ')}`);
    }

    return {
        requiresAdmin: reasons.length > 0,
        reasons
    };
}

/**
 * Check if a question can be auto-approved
 * Returns { canAutoApprove: boolean, reasons: string[] }
 */
export function checkAutoApproveRules(question, aiReview) {
    if (!aiReview) {
        return { canAutoApprove: false, reasons: ['AI review not available'] };
    }

    const requirements = [];
    let canAutoApprove = true;

    // Requirement 1: Boundedness must be B2
    if (aiReview.boundedness !== 'B2') {
        canAutoApprove = false;
        requirements.push(`Boundedness is ${aiReview.boundedness} (needs B2)`);
    }

    // Requirement 2: All confidence metrics >= 0.70
    const confidenceThreshold = 0.70;
    const confidenceChecks = [
        { name: 'Bloom', value: aiReview.bloom_confidence },
        { name: 'HOTS', value: aiReview.hots_confidence },
        { name: 'Difficulty', value: aiReview.difficulty_confidence },
        { name: 'Boundedness', value: aiReview.boundedness_confidence }
    ];

    for (const check of confidenceChecks) {
        if (check.value < confidenceThreshold) {
            canAutoApprove = false;
            requirements.push(`${check.name} confidence ${(check.value * 100).toFixed(0)}% < 70%`);
        }
    }

    // Requirement 3: Difficulty label matches teacher OR differs by at most 1 band
    const difficultyLevels = { easy: 1, medium: 2, hard: 3 };
    const teacherLevel = difficultyLevels[question.teacher_difficulty] || 2;
    const aiLevel = difficultyLevels[aiReview.difficulty_label] || 2;

    if (Math.abs(teacherLevel - aiLevel) > 1) {
        canAutoApprove = false;
        requirements.push(`Difficulty mismatch: teacher=${question.teacher_difficulty}, AI=${aiReview.difficulty_label}`);
    }

    // Requirement 4: No major flags
    if (aiReview.ambiguity_flags?.length > 0 ||
        aiReview.missing_info_flags?.length > 0 ||
        aiReview.grade_fit_flags?.length > 0) {
        canAutoApprove = false;
        requirements.push('Has quality flags');
    }

    return {
        canAutoApprove,
        reasons: requirements
    };
}

/**
 * Get queue priority for admin review (lower = higher priority)
 */
export function getQueuePriority(question, aiReview, routingReasons) {
    let priority = 100; // Default

    // Highest priority: B0 boundedness
    if (aiReview?.boundedness === 'B0') {
        priority = Math.min(priority, 10);
    }

    // High priority: Easy <-> Hard mismatch
    const difficultyLevels = { easy: 1, medium: 2, hard: 3 };
    const teacherLevel = difficultyLevels[question.teacher_difficulty] || 2;
    const aiLevel = difficultyLevels[aiReview?.difficulty_label] || 2;
    if (Math.abs(teacherLevel - aiLevel) >= 2) {
        priority = Math.min(priority, 20);
    }

    // Medium priority: Low confidence
    const minConfidence = Math.min(
        aiReview?.bloom_confidence || 1,
        aiReview?.hots_confidence || 1,
        aiReview?.difficulty_confidence || 1,
        aiReview?.boundedness_confidence || 1
    );
    if (minConfidence < 0.5) {
        priority = Math.min(priority, 30);
    } else if (minConfidence < 0.65) {
        priority = Math.min(priority, 40);
    }

    // Medium priority: HOTS claim but low Bloom/weak HOTS
    if (question.teacher_hots_claim &&
        (aiReview?.primary_bloom_level <= 3 || aiReview?.hots_strength === 'S0')) {
        priority = Math.min(priority, 50);
    }

    return priority;
}

/**
 * Format routing reasons for display
 */
export function formatRoutingReasons(reasons) {
    if (!reasons || reasons.length === 0) {
        return 'No issues detected';
    }

    return reasons.map((reason, index) => `${index + 1}. ${reason}`).join('\n');
}

/**
 * Get status badge color based on routing result
 */
export function getStatusBadgeColor(status) {
    const colors = {
        'draft': 'gray',
        'submitted_for_review': 'blue',
        'ai_reviewed': 'purple',
        'admin_review_required': 'orange',
        'returned_to_teacher': 'red',
        'approved': 'green',
        'published': 'green',
        'archived': 'gray'
    };
    return colors[status] || 'gray';
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status) {
    const labels = {
        'draft': 'Draft',
        'submitted_for_review': 'Submitted for Review',
        'ai_reviewed': 'AI Reviewed',
        'admin_review_required': 'Needs Admin Review',
        'returned_to_teacher': 'Returned for Revision',
        'approved': 'Approved',
        'published': 'Published',
        'archived': 'Archived'
    };
    return labels[status] || status;
}
