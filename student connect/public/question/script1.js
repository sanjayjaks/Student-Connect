document.querySelectorAll('.like-button').forEach(button => {
    button.addEventListener('click', async (e) => {
        const answerId = e.target.getAttribute('data-answer-id');
        const userId = '<%= data.user_id %>'; // Assuming user ID is available in the template context

        const response = await fetch(`/question/${<%= data.id %>}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, answerId })
        });

        if (response.ok) {
            location.reload();
        }
    });
});