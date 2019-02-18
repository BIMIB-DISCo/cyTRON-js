document.addEventListener("DOMContentLoaded", function() {
    var register = document.getElementById('register')
    var register_div = document.getElementById('register_div')
    var input_password = document.getElementById('inputPassword')
    var confirm_password = document.getElementById('confirm_password')
    var input_username = document.getElementById('inputEmail')
    var form = document.getElementById('registration_form')

    register.disabled = true
    register_div.style.opacity = 0.7

    activate_register = function() {
        if (input_password.value != '' && confirm_password.value != '' && input_username.value != ''){ //&& input_password.value === confirm_password.value) {
            register.disabled = false
            register_div.style.opacity = 1
            //confirm_password.style.background = 'white' 
        } else {
            register.disabled = true
            register_div.style.opacity = 0.7
        }
    }

    confirm_password.addEventListener('input', activate_register)
    input_password.addEventListener('input', activate_register)
    input_email.addEventListener('input', activate_register)

    /*register.addEventListener('click', function() {
        var bool = true
        console.log(bool)
        if (input_password.value != confirm_password.value || input_password.value === '' || document.getElementById('inputEmail') ==='') {
            document.getElementById('error_password').innerText = "Passwords don't match"
        }
    })*/
    form.addEventListener('submit', function(evt) {
        
        if (input_password.value != confirm_password.value) {
            document.getElementById('error_password').innerText = "Passwords don't match"
            evt.preventDefault()
        } 
    })

    input_usernamename.addEventListener('keyup', function() {
        if (input_username.value.search(/\*|\\|\/|:|\?|"|<|>|\|/) != -1) {
            register.disabled = true
            register_div.style.opacity = 0.7
            document.getElementById('username_error').innerText = 'Error, username should not contain any of these characters: *, \\, /, :, ?, ", <, >, |'
        } else {
            document.getElementById('username_error').innerText = ''
            if (input_username.value == '') {
                register.disabled = true
                register_div.style.opacity = 0.7
            } else {
                start_div.style.opacity = 1
                start_btn.disabled = false
            }
        }
        
    })

})