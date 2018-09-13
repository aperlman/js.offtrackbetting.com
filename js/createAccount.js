 function checkPasswords() {
 	var password1 = document.getElementById('password');
 	var password2 = document.getElementById('passwordConfirm');
 	if (password1.value != password2.value) {
 		password2.setCustomValidity('Passwords do not match');
 	} else {
 		password2.setCustomValidity('');
 	}
 }

 function checkPins() {
 	var pin1 = document.getElementById('pinField');
 	var pin2 = document.getElementById('pinConfirmField');
 	if (pin1.value != pin2.value) {
 		pin2.setCustomValidity('PINs do not match');
 	} else {
 		pin2.setCustomValidity('');
 	}
 }