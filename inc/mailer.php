<?php

require_once("../PHPMailer/PHPMailerAutoload.php");
//include("class.smtp.php"); // optional, gets called from within class.phpmailer.php if not already loaded

$mail             = new PHPMailer();

$mail->IsSMTP();
$mail->SMTPAuth   = true;                  // enable SMTP authentication
$mail->SMTPSecure = 'ssl';                 // sets the prefix to the servier
$mail->CharSet    = 'UTF-8';
$mail->Host       = 'lunesu.com';   // sets GMAIL as the SMTP server
$mail->Port       = 465;                   // set the SMTP port for the GMAIL server


$mail->Username   = 'enumawww';          // GMAIL/sendgrid username
// add SetEnv SMTP_PASSWORD "blah" to this site's Apache conf
$mail->Password   = getenv('SMTP_PASSWORD');              // GMAIL/sendgrid password

$mail->From       = 'no-reply@e'.'numa.io';
$mail->FromName   = 'Enuma.io contact form';

$mail->WordWrap   = 60; // set word wrap

function mailer($mail_to, $subject, $body)
{
	global $mail;

	$mail->Subject = $subject;
	$mail->Body = $body;
	$mail->ClearAddresses();
	$mail->AddAddress($mail_to);
	$mail->Send()
		or die('Failed to send email: '.$mail->ErrorInfo);
}

function mail_and_die($subject, $body)
{
  mailer('lio+enumawww@l'.'unesu.com', $subject, $body);
  die($subject."\n".$body);
}


if ( $_SERVER['REQUEST_METHOD'] == 'POST' )
{
  if ($_POST['honey'] == 'nxTdUEHiBbh4z1N')
  {
		mailer('info@enuma.io', 'Request from: '.$_POST['name'].', '.$_POST['emailid'], $_POST['message']);

		$auto_reply_body = <<<EOF
Thank you for contacting Enuma Technologies. 

To better understand your need and ensure we have the right team member to follow up with you, we have put in place an initial assessment. Please kindly provide the following information and we will revert to you within 3 business days. The more information you provide, the sooner we will be able to get back to you with concrete plans.

1. Brief introduction of your project, including project/company name, website, and any other publicly available information (e.g. white paper, business plan) 

2. If your project is token sale related, please provide any information you have in hand such as timeline, soft/hard cap, progress made etc. 

3. Please provide a bit more colour on the areas you want to explore and basic information of your existing business e.g. "I own a payment company and want to get educated on blockchain and see if there is any value add to my existing business".

We look forward to hearing from you.

Best Regards,
Enuma Team 
EOF;

		$auto_reply_subject = "Thank you for contacting Enuma";

		mailer($_POST['emailid'], $auto_reply_subject, $auto_reply_body);
  }
}
