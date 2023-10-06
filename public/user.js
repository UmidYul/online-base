function logout() {
    fetch("/logout", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: false })
    })
    window.location.href = "/"
}
const id = window.location.href.slice(27)
const response = fetch("/id", {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: id })
})
    .then(response => response.json())
    .then(data => {
        console.log(document.getElementsByClassName("field")[0]);
        let arr = []
        arr.push(data)
        document.getElementsByClassName("field")[0].innerHTML =
            arr.map(i => {
                if (data.role == "admin") {
                    return `
            <div class="table"></div>
<a id="admin-link" href="/user:${id}/add-class"><button>Добавить Класс</button></a>
              `
                } else {
                    return `
            <div class="table"></div>
<a id="teacher-link" href="/user:${id}/add-student"><button>Добавить Ученика</button></a>
              `
                }
            }).join("")
    })