<!--
	if (document.images)
		{
  			pic1= new Image(115,21); 
  			pic1.src="/images/top_header/input_login.gif"; 
		}
		
	function sI(sId,sVal)
	{
		var oId = document.getElementById(sId);
		var bId = oId.style.backgroundImage;
		if(sVal=='')
		{
			if(bId.indexOf("input_accountNumber")<0 && bId.indexOf("input_login")>0 && oId.id == 'accountNumber')
			{
				oId.style.backgroundImage="url('/images/top_header/input_account.gif')";
			}
			else if(bId.indexOf("input_pin")<0 && bId.indexOf("input_login")>0 && oId.id == 'pin')
			{
				oId.style.backgroundImage="url('/images/top_header/input_pin.gif')";
			}
			else
			{
				oId.style.backgroundImage="url('/images/top_header/input_login.gif')";
			}
		}
		else
		{
			oId.style.backgroundImage="url('/images/top_header/input_login.gif')";
		}
	}
	
-->